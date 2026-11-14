"""Product update emails: campaigns sent in daily batches, with signed unsubscribe links."""
import asyncio
import hashlib
import hmac
import logging
import time
from datetime import datetime, timezone
from html import escape
from urllib.parse import quote

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal
from app.models.application import Application, ApplicationStatus
from app.models.update_email import UpdateEmail, UpdateEmailSend
from app.models.user import User
from app.services.email import _layout, send_email

log = logging.getLogger(__name__)

FILTERS = ("all", "active", "inactive", "exhausted")
THROTTLE_SECONDS = 0.25  # stay under Resend's 5 requests/second default limit


# ---- unsubscribe tokens ----
def unsubscribe_token(email: str) -> str:
    msg = b"unsubscribe:" + email.strip().lower().encode()
    return hmac.new(settings.JWT_SECRET.encode(), msg, hashlib.sha256).hexdigest()


def unsubscribe_url(email: str) -> str:
    return f"{settings.PUBLIC_API_URL.rstrip('/')}/unsubscribe?email={quote(email)}&token={unsubscribe_token(email)}"


# ---- audience ----
def eligible_users(user_filter: str):
    applied = (
        select(func.count(Application.id))
        .where(Application.user_id == User.id, Application.status == ApplicationStatus.APPLIED.value)
        .correlate(User)
        .scalar_subquery()
    )
    q = select(User).where(User.email_unsubscribed.is_(False), User.email != "")
    if user_filter == "active":
        q = q.where(applied >= 1)
    elif user_filter == "inactive":
        q = q.where(applied == 0)
    elif user_filter == "exhausted":
        q = q.where(applied >= settings.FREE_APPLICATIONS + User.paid_credits)
    elif user_filter != "all":
        raise ValueError(f"Unknown user_filter {user_filter!r}; use one of {FILTERS}")
    return q


# ---- rendering ----
def send_update_to_user(campaign: UpdateEmail, user: User) -> bool:
    first = user.name.split()[0] if user.name.strip() else "there"
    link = unsubscribe_url(user.email)
    text = f"Hi {first},\n\n{campaign.body}\n\n---\nUnsubscribe from product updates: {link}\n"
    body_html = f"<p>Hi {escape(first)},</p><div style='white-space:pre-wrap'>{escape(campaign.body)}</div>"
    footer = f'<a href="{escape(link)}" style="color:#737373">Unsubscribe</a> from product updates.'
    return send_email(
        user.email,
        campaign.subject,
        _layout(campaign.subject, body_html, footer),
        text,
        from_email=settings.UPDATE_EMAIL_FROM,
        # RFC 8058 one-click unsubscribe: Gmail/Yahoo require this for bulk senders.
        headers={"List-Unsubscribe": f"<{link}>", "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"},
    )


# ---- batch runner ----
def run_batch(db: Session, campaign_id: int, throttle: float = THROTTLE_SECONDS) -> int:
    """Send one batch. Returns the number of emails attempted."""
    campaign = db.get(UpdateEmail, campaign_id)
    if campaign is None or campaign.status not in ("scheduled", "running"):
        return 0

    audience = eligible_users(campaign.user_filter)
    if campaign.status == "scheduled":
        campaign.total_users = db.scalar(select(func.count()).select_from(audience.subquery())) or 0
        campaign.status = "running"
        db.commit()

    already = select(UpdateEmailSend.user_id).where(UpdateEmailSend.update_email_id == campaign_id)
    users = db.scalars(
        audience.where(User.id.not_in(already)).order_by(User.id).limit(campaign.batch_size)
    ).all()

    attempted = 0
    for user in users:
        # Claim the recipient BEFORE sending. The unique constraint makes a concurrent worker
        # skip this user, so the worst case is a missed email, never a duplicate.
        claim = UpdateEmailSend(update_email_id=campaign_id, user_id=user.id, status="sent")
        db.add(claim)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            continue
        ok = send_update_to_user(campaign, user)
        attempted += 1
        if ok:
            campaign.sent_count += 1
        else:
            claim.status = "failed"
            campaign.failed_count += 1
        db.commit()
        if throttle:
            time.sleep(throttle)

    remaining = db.scalar(
        select(func.count()).select_from(audience.where(User.id.not_in(already)).subquery())
    )
    if not remaining:
        campaign.status = "completed"
        db.commit()
    log.info("update_email id=%s batch attempted=%s remaining=%s", campaign_id, attempted, remaining)
    return attempted


def run_due_batches(db: Session, now: datetime | None = None, throttle: float = THROTTLE_SECONDS) -> int:
    """Run today's batch for every active campaign whose send hour it is. Safe to call often."""
    now = now or datetime.now(timezone.utc).replace(tzinfo=None)
    midnight = datetime(now.year, now.month, now.day)
    total = 0
    for c in db.scalars(select(UpdateEmail).where(UpdateEmail.status.in_(["scheduled", "running"]))).all():
        hour = c.send_hour if c.send_hour >= 0 else settings.UPDATE_EMAIL_SEND_HOUR
        if now.hour != hour:
            continue
        ran_today = db.scalar(
            select(UpdateEmailSend.id)
            .where(UpdateEmailSend.update_email_id == c.id, UpdateEmailSend.sent_at >= midnight)
            .limit(1)
        )
        if ran_today:  # DB-backed, so a restart can't trigger a second batch the same day
            continue
        total += run_batch(db, c.id, throttle)
    return total


def _tick() -> None:
    with SessionLocal() as db:
        run_due_batches(db)


async def scheduler_loop(poll_seconds: int = 600) -> None:
    """Poll every 10 minutes so the send hour is never skipped; the DB check prevents repeats."""
    while True:
        try:
            await asyncio.to_thread(_tick)
        except Exception:
            log.exception("update email scheduler tick failed")
        await asyncio.sleep(poll_seconds)
