"""Transactional email via Resend. Safe to call without a key (logs and skips), so local dev needs no setup."""
import logging
from html import escape

from app.config import settings

log = logging.getLogger(__name__)


class EmailError(Exception):
    pass


def _send_via_resend(params: dict) -> str | None:
    import resend  # lazy: the app still boots if the package is missing

    resend.api_key = settings.RESEND_API_KEY
    result = resend.Emails.send(params)
    return result.get("id") if isinstance(result, dict) else getattr(result, "id", None)


def send_email(
    to: str, subject: str, html: str, text: str, *, from_email: str = "", headers: dict | None = None
) -> bool:
    """Send one email. Never raises: a failed email must not break the request that triggered it."""
    if not settings.RESEND_API_KEY:
        log.warning("RESEND_API_KEY not set; skipping email %r to %s", subject, to)
        return False
    params: dict = {"from": from_email or settings.EMAIL_FROM, "to": [to], "subject": subject, "html": html, "text": text}
    if headers:
        params["headers"] = headers
    if settings.EMAIL_REPLY_TO:
        params["reply_to"] = settings.EMAIL_REPLY_TO
    try:
        rid = _send_via_resend(params)
        log.info("Sent %r to %s (resend_id=%s)", subject, to, rid)
        return True
    except Exception:
        log.exception("Resend failed sending %r to %s", subject, to)
        return False


def _layout(title: str, body_html: str, footer: str = "You got this because you signed in to Applier.") -> str:
    # Black and white, system/Geist font stack, no images or gradients.
    return (
        '<div style="font-family:Geist,-apple-system,Segoe UI,Helvetica,Arial,sans-serif;'
        'max-width:480px;margin:0 auto;padding:32px 24px;color:#000;background:#fff">'
        '<div style="font-size:18px;font-weight:600;letter-spacing:-0.03em;margin-bottom:24px">applier</div>'
        f'<h1 style="font-size:20px;font-weight:600;letter-spacing:-0.02em;margin:0 0 12px">{escape(title)}</h1>'
        f'<div style="font-size:14px;line-height:1.6;color:#333">{body_html}</div>'
        '<hr style="border:0;border-top:1px solid #e5e5e5;margin:32px 0 12px">'
        f'<div style="font-size:12px;color:#737373">{footer}</div>'
        "</div>"
    )


def send_welcome(to: str, name: str = "") -> bool:
    first = escape(name.split()[0]) if name.strip() else "there"
    body = (
        f"<p>Hi {first},</p>"
        f"<p>You have <b>{settings.FREE_APPLICATIONS} free applications</b>. "
        "Add your base resume, open a job posting, and Applier tailors it for you. "
        "Each tailored resume uses one credit; editing and downloading it afterwards is free and unlimited.</p>"
    )
    text = (
        f"Hi {first},\n\nYou have {settings.FREE_APPLICATIONS} free applications. Add your base resume, "
        "open a job posting, and Applier tailors it for you. Each tailored resume uses one credit; "
        "editing and downloading it afterwards is free and unlimited.\n"
    )
    return send_email(to, "Welcome to Applier", _layout("Welcome to Applier", body), text)


def send_quota_used(to: str) -> bool:
    price, minimum = settings.PRICE_PER_APPLICATION_USD, settings.MINIMUM_CHARGE_USD
    body = (
        "<p>You've used all your credits.</p>"
        f"<p>Open the Applier extension and choose <b>Buy credits</b> to keep going: ${price:.2f} per "
        f"application, ${minimum:.2f} minimum. Your existing resumes stay available to download.</p>"
    )
    text = (
        "You've used all your credits.\n\n"
        f"Open the Applier extension and choose Buy credits to keep going: ${price:.2f} per application, "
        f"${minimum:.2f} minimum. Your existing resumes stay available to download.\n"
    )
    return send_email(to, "You're out of Applier credits", _layout("Out of credits", body), text)
