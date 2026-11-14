import hmac
from fastapi import APIRouter, Depends, Query
from fastapi.responses import HTMLResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.services.pages import simple_page
from app.services.updates import unsubscribe_token

router = APIRouter(tags=["unsubscribe"])


def _unsubscribe(email: str, token: str, db: Session) -> HTMLResponse:
    if not hmac.compare_digest(unsubscribe_token(email), token):
        return simple_page("Invalid link", "This unsubscribe link is invalid.", 400)
    user = db.scalar(select(User).where(User.email == email.strip().lower()))
    if user and not user.email_unsubscribed:
        user.email_unsubscribed = True
        db.commit()
    return simple_page("Unsubscribed", "You won't receive product update emails from Applier anymore.")


# GET serves the link in the email; POST serves mail clients' RFC 8058 one-click unsubscribe.
@router.get("/unsubscribe", response_class=HTMLResponse)
def unsubscribe_get(email: str = Query(...), token: str = Query(...), db: Session = Depends(get_db)):
    return _unsubscribe(email, token, db)


@router.post("/unsubscribe", response_class=HTMLResponse)
def unsubscribe_post(email: str = Query(...), token: str = Query(...), db: Session = Depends(get_db)):
    return _unsubscribe(email, token, db)
