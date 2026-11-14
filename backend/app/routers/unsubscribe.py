import hmac
from html import escape

from fastapi import APIRouter, Depends, Query
from fastapi.responses import HTMLResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.services.updates import unsubscribe_token

router = APIRouter(tags=["unsubscribe"])


def _page(title: str, message: str, status: int = 200) -> HTMLResponse:
    html = f"""<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{escape(title)} - Applier</title>
<style>body{{margin:0;font-family:Geist,-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#000;background:#fff}}
.w{{max-width:420px;margin:96px auto;padding:0 24px}}.l{{font-size:18px;font-weight:600;letter-spacing:-.03em;margin-bottom:24px}}
h1{{font-size:20px;letter-spacing:-.02em;margin:0 0 8px}}p{{color:#525252;line-height:1.6;margin:0}}</style></head>
<body><div class="w"><div class="l">applier</div><h1>{escape(title)}</h1><p>{escape(message)}</p></div></body></html>"""
    return HTMLResponse(html, status_code=status)


def _unsubscribe(email: str, token: str, db: Session) -> HTMLResponse:
    if not hmac.compare_digest(unsubscribe_token(email), token):
        return _page("Invalid link", "This unsubscribe link is invalid.", 400)
    user = db.scalar(select(User).where(User.email == email.strip().lower()))
    if user and not user.email_unsubscribed:
        user.email_unsubscribed = True
        db.commit()
    return _page("Unsubscribed", "You won't receive product update emails from Applier anymore.")


# GET serves the link in the email; POST serves mail clients' RFC 8058 one-click unsubscribe.
@router.get("/unsubscribe", response_class=HTMLResponse)
def unsubscribe_get(email: str = Query(...), token: str = Query(...), db: Session = Depends(get_db)):
    return _unsubscribe(email, token, db)


@router.post("/unsubscribe", response_class=HTMLResponse)
def unsubscribe_post(email: str = Query(...), token: str = Query(...), db: Session = Depends(get_db)):
    return _unsubscribe(email, token, db)
