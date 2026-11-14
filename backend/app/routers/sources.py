import logging
import threading

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.config import settings
from app.database import SessionLocal, get_db
from app.dspy_modules.modules import parse_resume, revise_resume
from app.models.source_resume import SourceEdit, SourceResume
from app.models.user import User
from app.schemas import SECTIONS, EditIn, ResumeIn, SourceDocOut, SourceResumeOut, TailoredResume
from app.services.files import UnsupportedFile, extract_text
from app.services.history import clean_resume, describe, history_text, record
from app.services.render import to_markdown
from app.services.textclean import trim

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/source", tags=["source"])
MAX_UPLOAD = 5 * 1024 * 1024


def _out(s: SourceResume) -> SourceResumeOut:
    return SourceResumeOut(id=s.id, filename=s.filename, chars=len(s.text), preview=s.text[:400], created_at=s.created_at)


def active_source(db: Session, user: User) -> SourceResume | None:
    return db.scalar(
        select(SourceResume)
        .where(SourceResume.user_id == user.id, SourceResume.is_active.is_(True))
        .order_by(SourceResume.id.desc())
    )


def _save(db: Session, user: User, filename: str, text: str) -> SourceResume:
    db.execute(update(SourceResume).where(SourceResume.user_id == user.id).values(is_active=False))
    s = SourceResume(user_id=user.id, filename=filename, text=text[: settings.MAX_SOURCE_CHARS], is_active=True)
    db.add(s)
    db.commit()
    return s


@router.get("", response_model=SourceResumeOut | None)
def get_source(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    s = active_source(db, user)
    return _out(s) if s else None


@router.post("/upload", response_model=SourceResumeOut)
async def upload(
    background: BackgroundTasks, file: UploadFile = File(...), user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    data = await file.read()
    if len(data) > MAX_UPLOAD:
        raise HTTPException(413, "File too large (max 5 MB)")
    try:
        text = extract_text(file.filename or "", data)
    except UnsupportedFile as e:
        raise HTTPException(400, str(e))
    s = _save(db, user, file.filename or "resume", text)
    background.add_task(_parse_in_background, s.id)  # prepare the editable view now, so opening it later is instant
    return _out(s)


# ---------------------------------------------------------------- the source resume as an editable document
def _doc(s: SourceResume, notice: str = "") -> SourceDocOut:
    return SourceDocOut(
        id=s.id, filename=s.filename, resume=TailoredResume.model_validate(s.resume), version=s.version,
        can_undo=len(s.edits) > 1, last_edit=describe(s.edits[-1]) if len(s.edits) > 1 else "", notice=notice,
    )


def _active_or_404(db: Session, user: User) -> SourceResume:
    s = active_source(db, user)
    if s is None:
        raise HTTPException(404, "No source resume yet")
    return s


_parse_locks: dict[int, threading.Lock] = {}
_parse_locks_guard = threading.Lock()


def _parse_lock(source_id: int) -> threading.Lock:
    with _parse_locks_guard:
        return _parse_locks.setdefault(source_id, threading.Lock())


def _ensure_parsed(db: Session, s: SourceResume) -> None:
    """Turn the raw text into structured sections. Extraction only.

    Normally this already happened in the background right after the upload. If the user opens the editor while that
    is still running, this waits for it instead of paying for a second AI call."""
    if s.resume is not None:
        return
    with _parse_lock(s.id):
        db.refresh(s)  # the background task may have finished while we waited for the lock
        if s.resume is not None:
            return
        try:
            parsed = parse_resume(s.text)
        except Exception:
            log.exception("Resume parsing failed")
            raise HTTPException(502, "Could not read your resume into sections. Try again.")
        s.resume = parsed.model_copy(update={"section_order": list(SECTIONS)}).model_dump()  # the model never picks the layout
        s.edits.append(SourceEdit(kind="generate", resume=s.resume))
        db.commit()


def _parse_in_background(source_id: int) -> None:
    """Runs after the upload response is sent. A failure is fine: opening the editor retries it on demand."""
    with SessionLocal() as db:
        s = db.get(SourceResume, source_id)
        if s is None:
            return
        try:
            _ensure_parsed(db, s)
        except Exception:
            log.warning("Background resume parsing failed for source %s; it will be retried when opened", source_id)


def _apply(s: SourceResume, resume: TailoredResume) -> None:
    """Store an edited resume and write it back to the text that tailoring reads (hidden sections excluded)."""
    s.resume = resume.model_dump()
    s.text = trim(to_markdown(resume), settings.MAX_SOURCE_CHARS)
    s.version += 1


@router.get("/resume", response_model=SourceDocOut)
def get_source_doc(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    s = _active_or_404(db, user)
    _ensure_parsed(db, s)
    return _doc(s)


@router.put("/resume", response_model=SourceDocOut)
def save_source_doc(body: ResumeIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    s = _active_or_404(db, user)
    _ensure_parsed(db, s)
    if len(body.resume.model_dump_json()) > 60_000:
        raise HTTPException(413, "Resume is too long")
    edited = clean_resume(body.resume)
    if not edited.name:
        raise HTTPException(400, "Resume needs a name")
    _apply(s, edited)
    record(s, SourceEdit, "manual")
    db.commit()
    return _doc(s)


@router.post("/resume/edit", response_model=SourceDocOut)
def edit_source_doc(body: EditIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    s = _active_or_404(db, user)
    _ensure_parsed(db, s)
    current = TailoredResume.model_validate(s.resume)
    try:
        updated = revise_resume(
            to_markdown(TailoredResume.model_validate(s.edits[0].resume)), current,
            "(none: this is the user's own base resume, not a tailored one. Do not tailor it to any job.)",
            body.instruction + "\n(The one-page limit does not apply to this base resume.)", history_text(s),
        )
    except Exception:
        log.exception("Source resume edit failed")
        raise HTTPException(502, "The AI request failed. Try again.")
    _apply(s, updated.model_copy(update={"section_order": current.section_order}))  # keep the user's layout
    record(s, SourceEdit, "ai", body.instruction.strip())
    db.commit()
    return _doc(s)


@router.post("/resume/undo", response_model=SourceDocOut)
def undo_source_doc(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    s = _active_or_404(db, user)
    if len(s.edits) <= 1:
        raise HTTPException(400, "Nothing to undo")
    s.edits.pop()
    _apply(s, TailoredResume.model_validate(s.edits[-1].resume))
    db.commit()
    return _doc(s)
