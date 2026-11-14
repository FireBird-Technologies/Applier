from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.models.application import Application, ApplicationStatus
from app.models.user import User
from app.schemas import UsageOut
from app.services.billing import max_credits, min_credits, suggested_credits


def applied_count(db: Session, user: User) -> int:
    return db.scalar(
        select(func.count(Application.id)).where(
            Application.user_id == user.id, Application.status == ApplicationStatus.APPLIED.value
        )
    ) or 0


def credit_level(applied: int, total: int) -> str:
    """empty (none left) > low (<=20% left) > moderate (>=50% used) > ok."""
    remaining = max(0, total - applied)
    if remaining == 0:
        return "empty"
    if remaining <= total * settings.CREDITS_LOW_REMAINING:
        return "low"
    if applied >= total * settings.CREDITS_MODERATE_USED:
        return "moderate"
    return "ok"


def get_usage(db: Session, user: User) -> UsageOut:
    applied = applied_count(db, user)
    total = settings.FREE_APPLICATIONS + (user.paid_credits or 0)
    remaining = max(0, total - applied)
    return UsageOut(
        free_limit=settings.FREE_APPLICATIONS,
        paid_credits=user.paid_credits or 0,
        total=total,
        applied=applied,
        remaining=remaining,
        level=credit_level(applied, total),
        paywalled=remaining == 0,
        price_per_application_usd=settings.PRICE_PER_APPLICATION_USD,
        minimum_charge_usd=settings.MINIMUM_CHARGE_USD,
        min_credits=min_credits(),
        max_credits=max_credits(),
        suggested_credits=suggested_credits(),
    )
