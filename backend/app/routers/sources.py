from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.config import settings
from app.database import get_db
from app.models.source_resume import SourceResume
from app.models.user import User
from app.schemas import SourceResumeOut, SourceTextIn
from app.services.files import UnsupportedFile, extract_text

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
async def upload(file: UploadFile = File(...), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    data = await file.read()
    if len(data) > MAX_UPLOAD:
        raise HTTPException(413, "File too large (max 5 MB)")
    try:
        text = extract_text(file.filename or "", data)
    except UnsupportedFile as e:
        raise HTTPException(400, str(e))
    return _out(_save(db, user, file.filename or "resume", text))


@router.post("/text", response_model=SourceResumeOut)
def paste(body: SourceTextIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if len(body.text.strip()) < 80:
        raise HTTPException(400, "Resume text is too short")
    return _out(_save(db, user, body.filename, body.text.strip()))
