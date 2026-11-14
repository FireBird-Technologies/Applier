from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import create_access_token, get_current_user
from app.config import settings
from app.database import get_db
from app.models.user import User
from app.services.email import send_welcome
from app.schemas import AuthOut, GoogleLoginRequest, UserOut
from app.services.usage import get_usage

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _user_out(u: User) -> UserOut:
    return UserOut(id=u.id, email=u.email, name=u.name, picture=u.picture)


@router.post("/google", response_model=AuthOut)
def google_login(body: GoogleLoginRequest, background: BackgroundTasks, db: Session = Depends(get_db)):
    """Verify a Google ID token (obtained in the extension) and create/login the user."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(500, "GOOGLE_CLIENT_ID is not configured")
    try:
        info = id_token.verify_oauth2_token(body.credential, google_requests.Request(), settings.GOOGLE_CLIENT_ID)
    except ValueError as e:
        raise HTTPException(401, f"Invalid Google token: {e}")
    if not info.get("email_verified"):
        raise HTTPException(401, "Google email is not verified")

    user = db.scalar(select(User).where(User.google_sub == info["sub"]))
    is_new = user is None
    if is_new:
        user = User(google_sub=info["sub"], email=info["email"])
        db.add(user)
    user.name = info.get("name", "") or user.name
    user.picture = info.get("picture", "") or user.picture
    db.commit()
    if is_new:
        background.add_task(send_welcome, user.email, user.name)
    return AuthOut(access_token=create_access_token(user.id), user=_user_out(user), usage=get_usage(db, user))


@router.get("/me", response_model=AuthOut)
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return AuthOut(access_token="", user=_user_out(user), usage=get_usage(db, user))
