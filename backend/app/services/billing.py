"""Credit pricing and Stripe Checkout. One credit = one application (one first download)."""
import logging
import math
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.models.payment import Payment
from app.models.user import User

log = logging.getLogger(__name__)
# A 100%-off promo code finishes with no charge, and Stripe then reports "no_payment_required" instead of "paid".
PAID_STATES = ("paid", "no_payment_required")


class PaymentsNotConfigured(Exception):
    pass


def _cents(usd: float) -> Decimal:
    return (Decimal(str(usd)) * 100).quantize(Decimal(1), rounding=ROUND_HALF_UP)


def min_credits() -> int:
    """Smallest purchase: the credits that reach the minimum charge."""
    return math.ceil(_cents(settings.MINIMUM_CHARGE_USD) / _cents(settings.PRICE_PER_APPLICATION_USD))


def max_credits() -> int:
    return max(settings.MAX_CREDITS_PER_PURCHASE, min_credits())


def suggested_credits() -> list[int]:
    """Pack sizes to suggest: the minimum purchase plus SUGGESTED_CREDITS, kept within the allowed range."""
    lo, hi = min_credits(), max_credits()
    picked = {int(p) for p in settings.SUGGESTED_CREDITS.replace(" ", "").split(",") if p.isdigit() and lo <= int(p) <= hi}
    return sorted({lo, *picked})


def amount_cents(credits: int) -> int:
    """Price in cents: credits * unit price, but never below the minimum charge."""
    return int(max(_cents(settings.MINIMUM_CHARGE_USD), credits * _cents(settings.PRICE_PER_APPLICATION_USD)))


def _stripe():
    if not settings.STRIPE_SECRET_KEY:
        raise PaymentsNotConfigured("Payments are not configured")
    import stripe  # lazy: the app still boots without the package or a key

    stripe.api_key = settings.STRIPE_SECRET_KEY
    return stripe


def create_checkout_session(user: User, credits: int) -> dict:
    """Create a Stripe-hosted Checkout Session. The user pays on checkout.stripe.com in a browser tab."""
    stripe = _stripe()
    base = settings.PUBLIC_API_URL.rstrip("/")
    session = stripe.checkout.Session.create(
        mode="payment",
        line_items=[{
            "quantity": 1,
            "price_data": {
                "currency": "usd",
                "unit_amount": amount_cents(credits),
                "product_data": {"name": f"{credits} Applier credits", "description": "1 credit = 1 tailored application"},
            },
        }],
        customer_email=user.email,
        allow_promotion_codes=settings.STRIPE_ALLOW_PROMO_CODES,
        client_reference_id=str(user.id),
        metadata={"user_id": str(user.id), "credits": str(credits)},
        success_url=f"{base}/billing/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{base}/billing/cancel",
    )
    return {"url": session["url"], "credits": credits, "amount_cents": amount_cents(credits)}


def retrieve_session(session_id: str) -> dict:
    return _stripe().checkout.Session.retrieve(session_id)


def construct_event(payload: bytes, signature: str):
    if not settings.STRIPE_WEBHOOK_SECRET:
        raise PaymentsNotConfigured("STRIPE_WEBHOOK_SECRET is not set")
    return _stripe().Webhook.construct_event(payload, signature, settings.STRIPE_WEBHOOK_SECRET)


def apply_checkout_session(db: Session, session: dict) -> int:
    """Credit the user for a PAID Checkout Session. Idempotent: the webhook and the success page can
    both call this for the same session and the credits are added once. Returns credits added (0 if none)."""
    if session.get("payment_status") not in PAID_STATES:
        return 0
    sid = session["id"]
    if db.scalar(select(Payment.id).where(Payment.stripe_session_id == sid)):
        return 0
    meta = session.get("metadata") or {}
    try:
        user = db.get(User, int(meta["user_id"]))
        credits = int(meta["credits"])
    except (KeyError, ValueError, TypeError):
        log.error("Checkout session %s has no usable metadata", sid)
        return 0
    if user is None or credits <= 0:
        log.error("Checkout session %s refers to a missing user or bad credit count", sid)
        return 0
    db.add(Payment(user_id=user.id, stripe_session_id=sid, credits=credits,
                   amount_cents=int(session.get("amount_total") or 0), status="paid"))
    user.paid_credits += credits
    try:
        db.commit()  # the unique session id makes a concurrent duplicate fail here, rolling back its credits
    except IntegrityError:
        db.rollback()
        return 0
    log.info("Added %s credits to user %s (session %s)", credits, user.id, sid)
    return credits
