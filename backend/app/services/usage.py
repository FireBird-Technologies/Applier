from datetime import datetime, timedelta, timezone

from sqlalchemy import and_, func, not_, select
from sqlalchemy.orm import Session

from app.config import settings
from app.models.application import Application, ApplicationStatus
from app.models.user import User
from app.schemas import UsageOut
from app.services.billing import max_credits, min_credits, suggested_credits

# A credit is reserved while the AI writes a resume. If the server died mid-request, the reservation expires.
STALE_RESERVATION = timedelta(minutes=15)


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def used_count(db: Session, user: User) -> int:
    """Credits spent = resumes generated. Editing and downloading them never costs more."""
    stale = and_(Application.status == ApplicationStatus.GENERATING.value, Application.created_at < utcnow() - STALE_RESERVATION)
    return db.scalar(select(func.count(Application.id)).where(Application.user_id == user.id, not_(stale))) or 0


def credit_level(used: int, total: int) -> str:
    """empty (none left) > low (<=20% left) > moderate (>=50% used) > ok."""
    remaining = max(0, total - used)
    if remaining == 0:
        return "empty"
    if remaining <= total * settings.CREDITS_LOW_REMAINING:
        return "low"
    if used >= total * settings.CREDITS_MODERATE_USED:
        return "moderate"
    return "ok"


def get_usage(db: Session, user: User) -> UsageOut:
    used = used_count(db, user)
    total = settings.FREE_APPLICATIONS + (user.paid_credits or 0)
    remaining = max(0, total - used)
    return UsageOut(
        free_limit=settings.FREE_APPLICATIONS,
        paid_credits=user.paid_credits or 0,
        total=total,
        used=used,
        remaining=remaining,
        level=credit_level(used, total),
        paywalled=remaining == 0,
        price_per_application_usd=settings.PRICE_PER_APPLICATION_USD,
        minimum_charge_usd=settings.MINIMUM_CHARGE_USD,
        min_credits=min_credits(),
        max_credits=max_credits(),
        suggested_credits=suggested_credits(),
        promo_codes=settings.STRIPE_ALLOW_PROMO_CODES,
    )
