import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas import CheckoutIn, CheckoutOut
from app.services import billing
from app.services.pages import simple_page

log = logging.getLogger(__name__)
router = APIRouter(tags=["billing"])


@router.post("/api/billing/checkout", response_model=CheckoutOut)
def checkout(body: CheckoutIn, user: User = Depends(get_current_user)):
    """Create a Stripe Checkout Session; the extension opens the returned URL in a new browser tab."""
    if body.credits < billing.min_credits():
        raise HTTPException(400, f"Minimum purchase is {billing.min_credits()} credits")
    if body.credits > billing.MAX_CREDITS:
        raise HTTPException(400, f"Maximum purchase is {billing.MAX_CREDITS} credits")
    try:
        return billing.create_checkout_session(user, body.credits)
    except billing.PaymentsNotConfigured:
        raise HTTPException(503, "Payments are not available yet")
    except Exception:
        log.exception("Stripe checkout creation failed")
        raise HTTPException(502, "Could not start checkout. Try again.")


@router.post("/api/billing/webhook")
async def webhook(request: Request, db: Session = Depends(get_db)):
    """Stripe -> us. The signed webhook is the source of truth for adding credits."""
    payload = await request.body()
    try:
        event = billing.construct_event(payload, request.headers.get("stripe-signature", ""))
    except billing.PaymentsNotConfigured:
        raise HTTPException(503, "Webhook is not configured")
    except Exception:  # bad payload or signature
        raise HTTPException(400, "Invalid webhook")
    if event["type"] in ("checkout.session.completed", "checkout.session.async_payment_succeeded"):
        billing.apply_checkout_session(db, event["data"]["object"])
    return {"received": True}


@router.get("/billing/success", response_class=HTMLResponse)
def success(session_id: str = Query(...), db: Session = Depends(get_db)):
    """Where Stripe sends the browser after paying. It also credits the account (idempotently), so local
    development works without webhook forwarding and the credits never lag behind this page."""
    try:
        session = billing.retrieve_session(session_id)
    except Exception:
        log.exception("Could not retrieve checkout session")
        return simple_page("Payment received", "We could not confirm it just now. Your credits will appear shortly.")
    added = billing.apply_checkout_session(db, session)
    if session.get("payment_status") != "paid":
        return simple_page("Payment pending", "Your payment has not completed yet. Credits are added once it does.")
    msg = f"{added} credits were added. " if added else "Your credits have been added. "
    return simple_page("Payment received", msg + "You can close this tab and go back to Applier.")


@router.get("/billing/cancel", response_class=HTMLResponse)
def cancel():
    return simple_page("Checkout cancelled", "No charge was made. You can close this tab and go back to Applier.")
