import logging
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.dspy_modules.modules import revise_resume, tailor_resume
from app.models.application import Application, ApplicationStatus
from app.models.source_resume import SourceResume
from app.models.user import User
from app.routers.sources import active_source
from app.schemas import ApplicationOut, DetectIn, DetectOut, EditIn, GenerateIn, TailoredResume
from app.services import render
from app.services.detect import detect
from app.services.email import send_quota_used
from app.services.usage import get_usage

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["applications"])


def _out(a: Application) -> ApplicationOut:
    return ApplicationOut(
        id=a.id, job_url=a.job_url, job_title=a.job_title, company=a.company, status=a.status,
        version=a.version, resume=TailoredResume.model_validate(a.resume),
        created_at=a.created_at, applied_at=a.applied_at,
    )


def _owned(db: Session, user: User, app_id: int) -> Application:
    a = db.get(Application, app_id)
    if a is None or a.user_id != user.id:
        raise HTTPException(404, "Application not found")
    return a


def _require_quota(db: Session, user: User):
    if get_usage(db, user).paywalled:
        raise HTTPException(402, "Free applications used up. Paid plans are coming soon.")


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
    if len(body.text.strip()) < 100:
        raise HTTPException(400, "Not enough job description text on this page")

    resume = _llm_call(tailor_resume, source.text, body.job_title, body.company, body.text)
    a = Application(
        user_id=user.id, source_resume_id=source.id, job_url=body.url[:2048],
        job_title=body.job_title[:512], company=body.company[:512],
        job_description=body.text, resume=resume.model_dump(),
    )
    db.add(a)
    db.commit()
    return _out(a)


@router.get("/applications", response_model=list[ApplicationOut])
def list_applications(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.scalars(
        select(Application).where(Application.user_id == user.id).order_by(Application.id.desc()).limit(50)
    )
    return [_out(a) for a in rows]


@router.get("/applications/{app_id}", response_model=ApplicationOut)
def get_application(app_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _out(_owned(db, user, app_id))


@router.post("/applications/{app_id}/edit", response_model=ApplicationOut)
def edit(app_id: int, body: EditIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    a = _owned(db, user, app_id)
    source = db.get(SourceResume, a.source_resume_id) if a.source_resume_id else None
    updated = _llm_call(
        revise_resume, source.text if source else "", TailoredResume.model_validate(a.resume),
        a.job_description, body.instruction,
    )
    a.resume = updated.model_dump()
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
        if get_usage(db, user).paywalled:  # this download used the last free application
            background.add_task(send_quota_used, user.email)
    data = render.render(TailoredResume.model_validate(a.resume), format)
    slug = "-".join(filter(None, [a.company, a.job_title])).lower().replace(" ", "-")[:60] or f"resume-{a.id}"
    return Response(
        content=data,
        media_type=render.FORMATS[format],
        headers={
            "Content-Disposition": f'attachment; filename="{slug}.{format}"',
            "X-Applications-Remaining": str(get_usage(db, user).remaining_free),
        },
    )
