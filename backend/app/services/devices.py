"""One browser, one account. Stops one person collecting free credits with several Google accounts."""
import hashlib
import hmac
import re

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.models.device import Device

DEVICE_IN_USE_MSG = "This browser is already linked to another Applier account. Sign in with that account instead."
_VALID = re.compile(r"^[A-Za-z0-9-]{16,100}$")


class DeviceInUse(Exception):
    pass


def valid_device_id(raw: str | None) -> bool:
    return bool(raw and _VALID.match(raw))


def device_hash(raw: str) -> str:
    """Keyed hash, so the database never holds the browser's real ID and a leaked table cannot be replayed."""
    return hmac.new(settings.JWT_SECRET.encode(), b"device:" + raw.encode(), hashlib.sha256).hexdigest()


def owner_of(db: Session, raw: str) -> int | None:
    return db.scalar(select(Device.user_id).where(Device.device_hash == device_hash(raw)))


def claim_or_verify(db: Session, user_id: int, raw: str) -> None:
    """The first account to use a browser claims it. Anyone else on that browser gets DeviceInUse."""
    owner = owner_of(db, raw)
    if owner is not None:
        if owner != user_id:
            raise DeviceInUse
        return
    db.add(Device(user_id=user_id, device_hash=device_hash(raw)))
    try:
        db.commit()
    except IntegrityError:  # two requests raced to claim it; whoever won owns it
        db.rollback()
        if owner_of(db, raw) != user_id:
            raise DeviceInUse
