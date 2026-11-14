from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.services.devices import DEVICE_IN_USE_MSG, DeviceInUse, claim_or_verify, valid_device_id

bearer = HTTPBearer(auto_error=False)


def create_access_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(hours=settings.JWT_EXPIRATION_HOURS),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
    x_device_id: str | None = Header(None),
) -> User:
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    try:
        payload = jwt.decode(creds.credentials, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user = db.get(User, int(payload["sub"]))
    except (jwt.InvalidTokenError, KeyError, ValueError):
        user = None
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    check_device(db, user, x_device_id)
    return user


def check_device(db: Session, user: User, device_id: str | None) -> None:
    """One browser, one account. Existing users claim their browser the first time they connect after this was added."""
    if device_id is None and not settings.REQUIRE_DEVICE_ID:
        return
    if not valid_device_id(device_id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Missing or invalid browser id. Update the extension.")
    try:
        claim_or_verify(db, user.id, device_id)
    except DeviceInUse:
        raise HTTPException(status.HTTP_403_FORBIDDEN, DEVICE_IN_USE_MSG)
