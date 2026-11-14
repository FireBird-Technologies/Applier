from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.models.application import Application, ApplicationStatus
from app.models.user import User
from app.schemas import UsageOut


def applied_count(db: Session, user: User) -> int:
    return db.scalar(
        select(func.count(Application.id)).where(
            Application.user_id == user.id, Application.status == ApplicationStatus.APPLIED.value
        )
    ) or 0


def get_usage(db: Session, user: User) -> UsageOut:
    applied = applied_count(db, user)
    remaining = max(0, settings.FREE_APPLICATIONS - applied)
    return UsageOut(
        free_limit=settings.FREE_APPLICATIONS,
        applied=applied,
        remaining_free=remaining,
        price_per_application_usd=settings.PRICE_PER_APPLICATION_USD,
        minimum_charge_usd=settings.MINIMUM_CHARGE_USD,
        paywalled=remaining == 0,
    )
