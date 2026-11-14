import logging
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Response
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.config import settings
from app.database import get_db
from app.dspy_modules.modules import revise_resume, tailor_resume
from app.models.application import Application, ApplicationEdit, ApplicationStatus
from app.models.source_resume import SourceResume
from app.models.user import User
from app.routers.sources import active_source
from app.schemas import ApplicationOut, DetectIn, DetectOut, EditIn, GenerateIn, ResumeIn, TailoredResume
from app.services import render
from app.services.render import describe_trim, fit_to_one_page
from app.services.detect import detect
from app.services.textclean import clean_text
from app.services.email import send_quota_used
from app.services.usage import get_usage

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["applications"])


def _out(a: Application) -> ApplicationOut:
    return ApplicationOut(
        id=a.id, job_url=a.job_url, job_title=a.job_title, company=a.company, status=a.status,
        version=a.version, resume=TailoredResume.model_validate(a.resume),
        created_at=a.created_at, applied_at=a.applied_at,
        can_undo=len(a.edits) > 1, last_edit=_describe(a.edits[-1]) if len(a.edits) > 1 else "",
    )


def _describe(e: ApplicationEdit) -> str:
    return e.instruction if e.kind == "ai" else "your manual edits"


def _record(a: Application, kind: str, instruction: str = "") -> None:
    """Snapshot the resume as it is now. Resumes made before history existed get a baseline first."""
    if not a.edits:
        a.edits.append(ApplicationEdit(kind="generate", resume=a.resume))
    a.edits.append(ApplicationEdit(kind=kind, instruction=instruction, resume=a.resume))


def _history_text(a: Application) -> str:
    """Earlier requests, oldest first, for the reviser. Undone edits are gone, so they are never re-applied."""
    lines = []
    for e in a.edits[1:][-20:]:
        lines.append(f"- {e.instruction}" if e.kind == "ai" else "- (the user edited the text by hand)")
    return "
".join(lines)


def _owned(db: Session, user: User, app_id: int) -> Application:
    a = db.get(Application, app_id)
    if a is None or a.user_id != user.id:
        raise HTTPException(404, "Application not found")
    return a


def _require_quota(db: Session, user: User):
    if get_usage(db, user).paywalled:
        raise HTTPException(402, "You are out of credits. Buy more to keep downloading.")


def _llm_call(fn, *args):
    try:
        return fn(*args)
    except Exception:
        log.exception("LLM call failed")
        raise HTTPException(502, "The AI request failed. Try again.")


@router.post("/detect", response_model=DetectOut)
def detect_page(body: DetectIn, user: User = Depends(get_current_user)):
    try:
        return detect(body)
    except Exception:
        log.exception("detect failed")
        raise HTTPException(502, "Detection failed. You can mark the page as a job manually.")


@router.post("/applications", response_model=ApplicationOut)
def generate(body: GenerateIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    source = active_source(db, user)
    if source is None:
        raise HTTPException(400, "Add a source resume first")
    _require_quota(db, user)
    jd = clean_text(body.text, limit=settings.MAX_JOB_CHARS)
    if len(jd) < 100:
        raise HTTPException(400, "Not enough job description text on this page")

    resume = fit_to_one_page(_llm_call(tailor_resume, source.text, body.job_title, body.company, jd))
    a = Application(
        user_id=user.id, source_resume_id=source.id, job_url=body.url[:2048],
        job_title=body.job_title[:512], company=body.company[:512],
        job_description=jd, resume=resume.model_dump(),
    )
    a.edits.append(ApplicationEdit(kind="generate", resume=a.resume))
    db.add(a)
    db.commit()
    return _out(a)


@router.get("/applications", response_model=list[ApplicationOut])
def list_applications(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.scalars(
        select(Application).where(Application.user_id == user.id).options(selectinload(Application.edits))
        .order_by(Application.id.desc()).limit(50)
    )
    return [_out(a) for a in rows]


@router.get("/applications/{app_id}", response_model=ApplicationOut)
def get_application(app_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _out(_owned(db, user, app_id))


def _clean_resume(r: TailoredResume) -> TailoredResume:
    """Trim whitespace and drop empty list items/entries from a hand-edited resume."""
    def lines(xs): return [x.strip() for x in xs if x and x.strip()]
    r = r.model_copy(deep=True)
    r.name, r.headline, r.summary = r.name.strip(), r.headline.strip(), r.summary.strip()
    r.contact, r.skills, r.certifications = lines(r.contact), lines(r.skills), lines(r.certifications)
    for e in r.experience:
        e.bullets = lines(e.bullets)
    for p in r.projects:
        p.bullets = lines(p.bullets)
    for e in r.education:
        e.details = lines(e.details)
    r.experience = [e for e in r.experience if e.title.strip() or e.company.strip() or e.bullets]
    r.projects = [p for p in r.projects if p.name.strip() or p.bullets]
    r.education = [e for e in r.education if e.school.strip() or e.degree.strip()]
    return r


@router.put("/applications/{app_id}", response_model=ApplicationOut)
def save_manual_edits(app_id: int, body: ResumeIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Save a hand-edited resume. It is still kept to one page; anything removed is reported in `notice`."""
    a = _owned(db, user, app_id)
    if len(body.resume.model_dump_json()) > 40_000:
        raise HTTPException(413, "Resume is too long")
    edited = _clean_resume(body.resume)
    if not edited.name:
        raise HTTPException(400, "Resume needs a name")
    fitted = fit_to_one_page(edited)
    if not a.edits:
        a.edits.append(ApplicationEdit(kind="generate", resume=a.resume))  # baseline before the first change
    a.resume = fitted.model_dump()
    a.version += 1
    _record(a, "manual")
    db.commit()
    out = _out(a)
    out.notice = describe_trim(edited, fitted)
    return out


@router.post("/applications/{app_id}/edit", response_model=ApplicationOut)
def edit(app_id: int, body: EditIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    a = _owned(db, user, app_id)
    source = db.get(SourceResume, a.source_resume_id) if a.source_resume_id else None
    updated = _llm_call(
        revise_resume, source.text if source else "", TailoredResume.model_validate(a.resume),
        a.job_description, body.instruction, _history_text(a),
    )
    if not a.edits:
        a.edits.append(ApplicationEdit(kind="generate", resume=a.resume))  # baseline before the first change
    a.resume = fit_to_one_page(updated).model_dump()
    a.version += 1
    _record(a, "ai", body.instruction.strip())
    db.commit()
    return _out(a)


@router.post("/applications/{app_id}/undo", response_model=ApplicationOut)
def undo(app_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Step back one edit (AI or manual). The undone request is forgotten, so it is not re-applied later."""
    a = _owned(db, user, app_id)
    if len(a.edits) <= 1:
        raise HTTPException(400, "Nothing to undo")
    a.edits.pop()
    a.resume = a.edits[-1].resume
    a.version += 1
    db.commit()
    return _out(a)


@router.get("/applications/{app_id}/download")
def download(
    app_id: int,
    background: BackgroundTasks,
    format: str = Query("pdf", pattern="^(pdf|docx|md|txt)$"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Downloading is what counts as applying: the first download flips draft -> applied."""
    a = _owned(db, user, app_id)
    if a.status == ApplicationStatus.DRAFT.value:
        _require_quota(db, user)
        a.status = ApplicationStatus.APPLIED.value
        a.applied_at = datetime.now(timezone.utc).replace(tzinfo=None)
        db.commit()
        if get_usage(db, user).paywalled:  # this download used the last credit
            background.add_task(send_quota_used, user.email)
    data = render.render(TailoredResume.model_validate(a.resume), format)
    slug = "-".join(filter(None, [a.company, a.job_title])).lower().replace(" ", "-")[:60] or f"resume-{a.id}"
    return Response(
        content=data,
        media_type=render.FORMATS[format],
        headers={
            "Content-Disposition": f'attachment; filename="{slug}.{format}"',
            "X-Applications-Remaining": str(get_usage(db, user).remaining),
        },
    )
