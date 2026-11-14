import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models.user import User
from app.config import settings
from app.schemas import CheckoutIn, CheckoutOut, PricingOut
from app.services import billing
from app.services.pages import simple_page

log = logging.getLogger(__name__)
router = APIRouter(tags=["billing"])


@router.get("/api/pricing", response_model=PricingOut)
def pricing(response: Response):
    """Public. The website reads prices from here so they always match what checkout charges."""
    response.headers["Cache-Control"] = "public, max-age=60"
    return PricingOut(
        free_credits=settings.FREE_APPLICATIONS, price_per_application_usd=settings.PRICE_PER_APPLICATION_USD,
        minimum_charge_usd=settings.MINIMUM_CHARGE_USD, min_credits=billing.min_credits(),
        max_credits=billing.max_credits(), suggested_credits=billing.suggested_credits(),
        promo_codes=settings.STRIPE_ALLOW_PROMO_CODES,
    )


@router.post("/api/billing/checkout", response_model=CheckoutOut)
def checkout(body: CheckoutIn, user: User = Depends(get_current_user)):
    """Create a Stripe Checkout Session; the extension opens the returned URL in a new browser tab."""
    if body.credits < billing.min_credits():
        raise HTTPException(400, f"Minimum purchase is {billing.min_credits()} credits")
    if body.credits > billing.max_credits():
        raise HTTPException(400, f"Maximum purchase is {billing.max_credits()} credits")
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


@router.get("/api/billing/confirm")
def confirm(session_id: str = Query(..., pattern=r"^cs_[A-Za-z0-9_]{6,200}$"), db: Session = Depends(get_db)):
    """For the website's return page: confirm a Checkout Session with Stripe and add the credits. Idempotent, and
    Stripe's webhook adds them too, so it is safe to call repeatedly."""
    try:
        session = billing.retrieve_session(session_id)
    except billing.PaymentsNotConfigured:
        raise HTTPException(503, "Payments are not available")
    except Exception:
        log.exception("Could not retrieve checkout session")
        raise HTTPException(502, "Could not confirm the payment yet")
    added = billing.apply_checkout_session(db, session)
    paid = session.get("payment_status") in billing.PAID_STATES
    return {"status": "paid" if paid else "pending", "credits_added": added}


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
    if session.get("payment_status") not in billing.PAID_STATES:
        return simple_page("Payment pending", "Your payment has not completed yet. Credits are added once it does.")
    msg = f"{added} credits were added. " if added else "Your credits have been added. "
    return simple_page("Payment received", msg + "You can close this tab and go back to Applier.")


@router.get("/billing/cancel", response_class=HTMLResponse)
def cancel():
    return simple_page("Checkout cancelled", "No charge was made. You can close this tab and go back to Applier.")
