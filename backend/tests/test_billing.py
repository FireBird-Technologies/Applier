import os

os.environ["DATABASE_URL"] = "sqlite:///./test.db"
os.environ["FREE_APPLICATIONS"] = "10"
os.environ["UPDATE_EMAIL_SCHEDULER"] = "false"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

import app.routers.applications as apps_router
import app.services.billing as billing
from app.auth import create_access_token
from app.database import Base, SessionLocal, engine
from app.main import app
from app.models.application import Application
from app.models.payment import Payment
from app.models.user import User
from app.schemas import Experience, TailoredResume
from app.services.usage import credit_level

RESUME = ("Jane Doe, senior engineer with 8 years of Python and Postgres experience. " * 3).encode()
JD = "We are hiring a Backend Engineer. You will build APIs in Python. " * 5


@pytest.fixture()
def client(monkeypatch):
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    monkeypatch.setattr(billing.settings, "FREE_APPLICATIONS", 10)  # settings load once per process
    monkeypatch.setattr(apps_router, "tailor_resume", lambda *a: TailoredResume(name="Jane"))
    with SessionLocal() as db:
        u = User(google_sub="g1", email="jane@x.com", name="Jane")
        db.add(u)
        db.commit()
        tok = create_access_token(u.id)
    return TestClient(app, headers={"Authorization": f"Bearer {tok}"})


# ---------------------------------------------------------------- credit meter
@pytest.mark.parametrize("applied,total,level", [
    (0, 10, "ok"), (4, 10, "ok"), (5, 10, "moderate"), (7, 10, "moderate"),
    (8, 10, "low"), (9, 10, "low"), (10, 10, "empty"), (30, 40, "moderate"), (32, 40, "low"),
])
def test_credit_levels(applied, total, level):
    assert credit_level(applied, total) == level


def test_usage_endpoint_reports_level_and_totals(client):
    u = client.get("/api/auth/me").json()["usage"]
    assert (u["total"], u["remaining"], u["level"], u["paid_credits"]) == (10, 10, "ok", 0)
    assert u["min_credits"] == 30
    with SessionLocal() as db:
        user = db.scalar(select(User))
        user.paid_credits = 40
        for _ in range(26):
            db.add(Application(user_id=user.id, job_description="jd", resume={}, status="applied"))
        db.commit()
    u = client.get("/api/auth/me").json()["usage"]
    assert (u["total"], u["used"], u["remaining"], u["level"], u["paywalled"]) == (50, 26, 24, "moderate", False)


# ---------------------------------------------------------------- pricing
def test_pricing_minimum_charge():
    assert billing.min_credits() == 30
    assert billing.amount_cents(30) == 300
    assert billing.amount_cents(10) == 300  # below the minimum is still charged the minimum
    assert billing.amount_cents(50) == 500
    assert billing.amount_cents(100) == 1000


# ---------------------------------------------------------------- checkout
def test_checkout_validation_and_session(client, monkeypatch):
    assert client.post("/api/billing/checkout", json={"credits": 29}).status_code == 400
    assert client.post("/api/billing/checkout", json={"credits": 99999}).status_code == 400
    assert client.post("/api/billing/checkout", json={"credits": 30}).status_code == 503  # no Stripe key

    seen = {}

    class FakeSession:
        @staticmethod
        def create(**kw):
            seen.update(kw)
            return {"url": "https://checkout.stripe.com/c/pay/cs_test_1"}

    class FakeStripe:
        api_key = None
        checkout = type("c", (), {"Session": FakeSession})

    monkeypatch.setattr(billing.settings, "STRIPE_SECRET_KEY", "sk_test_x")
    monkeypatch.setattr(billing, "_stripe", lambda: FakeStripe)
    r = client.post("/api/billing/checkout", json={"credits": 50})
    assert r.status_code == 200
    assert r.json() == {"url": "https://checkout.stripe.com/c/pay/cs_test_1", "credits": 50, "amount_cents": 500}
    assert seen["mode"] == "payment" and seen["line_items"][0]["price_data"]["unit_amount"] == 500
    assert seen["metadata"]["credits"] == "50" and seen["customer_email"] == "jane@x.com"
    assert "{CHECKOUT_SESSION_ID}" in seen["success_url"]
    assert seen["allow_promotion_codes"] is True  # Stripe shows the promo code box


# ---------------------------------------------------------------- crediting
def paid_session(sid="cs_1", credits=50, user_id=1, status="paid"):
    return {"id": sid, "payment_status": status, "amount_total": 500,
            "metadata": {"user_id": str(user_id), "credits": str(credits)}}


def test_apply_session_is_idempotent_and_ignores_unpaid(client):
    with SessionLocal() as db:
        assert billing.apply_checkout_session(db, paid_session(status="unpaid")) == 0
        assert billing.apply_checkout_session(db, paid_session()) == 50
        assert billing.apply_checkout_session(db, paid_session()) == 0  # webhook + success page both fire
        assert billing.apply_checkout_session(db, {"id": "cs_bad", "payment_status": "paid", "metadata": {}}) == 0
        assert db.scalar(select(User)).paid_credits == 50
        assert len(db.scalars(select(Payment)).all()) == 1
    assert client.get("/api/auth/me").json()["usage"]["total"] == 60


def test_webhook_requires_valid_signature_and_credits_once(client, monkeypatch):
    monkeypatch.setattr(billing.settings, "STRIPE_WEBHOOK_SECRET", "whsec_x")

    def construct(payload, sig):
        if sig != "good":
            raise ValueError("bad signature")
        return {"type": "checkout.session.completed", "data": {"object": paid_session("cs_w", 30)}}

    monkeypatch.setattr(billing, "construct_event", construct)
    assert client.post("/api/billing/webhook", content=b"{}", headers={"stripe-signature": "bad"}).status_code == 400
    for _ in range(2):  # Stripe retries deliveries
        assert client.post("/api/billing/webhook", content=b"{}", headers={"stripe-signature": "good"}).status_code == 200
    assert client.get("/api/auth/me").json()["usage"]["paid_credits"] == 30


def test_success_page_credits_account_without_webhook(client, monkeypatch):
    monkeypatch.setattr(billing, "retrieve_session", lambda sid: paid_session(sid, 30))
    r = TestClient(app).get("/billing/success", params={"session_id": "cs_s"})  # browser, no auth header
    assert r.status_code == 200 and "30 credits were added" in r.text
    assert client.get("/api/auth/me").json()["usage"]["paid_credits"] == 30
    again = TestClient(app).get("/billing/success", params={"session_id": "cs_s"})
    assert again.status_code == 200 and client.get("/api/auth/me").json()["usage"]["paid_credits"] == 30


def test_bought_credits_unlock_generating(client):
    client.post("/api/source/upload", files={"file": ("cv.txt", RESUME)})
    with SessionLocal() as db:
        user = db.scalar(select(User))
        for _ in range(10):
            db.add(Application(user_id=user.id, job_description="jd", resume={}, status="applied"))
        db.commit()
    assert client.post("/api/applications", json={"text": JD}).status_code == 402  # out of credits
    with SessionLocal() as db:
        billing.apply_checkout_session(db, paid_session(credits=30))
    r = client.post("/api/applications", json={"text": JD})
    assert r.status_code == 200
    assert client.get(f"/api/applications/{r.json()['id']}/download").status_code == 200
    assert client.get('/api/auth/me').json()['usage']['used'] == 11  # the new resume spent one of the bought credits


# ---------------------------------------------------------------- manual edits
def test_manual_edit_saves_cleans_and_stays_one_page(client):
    client.post("/api/source/upload", files={"file": ("cv.txt", RESUME)})
    aid = client.post("/api/applications", json={"text": JD}).json()["id"]

    edited = {"resume": {"name": "  Jane Q. Doe ", "summary": "Hand written.", "skills": ["Python", " ", "SQL"],
                         "experience": [{"title": "Engineer", "company": "Acme", "bullets": ["Did a thing", "  ", "Did two"]},
                                        {"title": "", "company": "", "bullets": []}]}}
    r = client.put(f"/api/applications/{aid}", json=edited).json()
    assert r["resume"]["name"] == "Jane Q. Doe" and r["resume"]["skills"] == ["Python", "SQL"]
    assert r["resume"]["experience"][0]["bullets"] == ["Did a thing", "Did two"]
    assert len(r["resume"]["experience"]) == 1 and r["notice"] == "" and r["version"] == 2

    long_job = {"title": "Eng", "company": "Co", "bullets": ["Shipped a large, well-tested service end to end and cut costs by 30%."] * 14}
    huge = {"resume": {"name": "Jane", "certifications": [f"Cert {i}" for i in range(10)],
                       "experience": [long_job] * 6}}
    r = client.put(f"/api/applications/{aid}", json=huge).json()
    assert "removed" in r["notice"] and r["resume"]["certifications"] == []  # trimmed, and we say so
    assert client.get(f"/api/applications/{aid}/download?format=pdf").status_code == 200

    assert client.put(f"/api/applications/{aid}", json={"resume": {"name": "  "}}).status_code == 400


# ---------------------------------------------------------------- promo codes
def test_promo_codes_can_be_switched_off(client, monkeypatch):
    seen = {}

    class FakeSession:
        @staticmethod
        def create(**kw):
            seen.update(kw)
            return {"url": "https://checkout.stripe.com/x"}

    class FakeStripe:
        checkout = type("c", (), {"Session": FakeSession})

    monkeypatch.setattr(billing.settings, "STRIPE_SECRET_KEY", "sk_test_x")
    monkeypatch.setattr(billing.settings, "STRIPE_ALLOW_PROMO_CODES", False)
    monkeypatch.setattr(billing, "_stripe", lambda: FakeStripe)
    assert client.post("/api/billing/checkout", json={"credits": 30}).status_code == 200
    assert seen["allow_promotion_codes"] is False
    assert client.get("/api/auth/me").json()["usage"]["promo_codes"] is False


def test_discounted_and_free_promo_sessions_still_grant_the_credits(client):
    with SessionLocal() as db:
        half = {**paid_session("cs_half", 50), "amount_total": 250}  # 50% off: pays less, same credits
        assert billing.apply_checkout_session(db, half) == 50
        free = {**paid_session("cs_free", 30, status="no_payment_required"), "amount_total": 0}  # 100% off code
        assert billing.apply_checkout_session(db, free) == 30
        assert billing.apply_checkout_session(db, free) == 0  # still idempotent
        assert db.scalar(select(User)).paid_credits == 80
        assert sorted(p.amount_cents for p in db.scalars(select(Payment))) == [0, 250]  # records what was really paid


def test_success_page_accepts_a_free_promo_session(client, monkeypatch):
    monkeypatch.setattr(billing, "retrieve_session", lambda sid: {**paid_session(sid, 30, status="no_payment_required"), "amount_total": 0})
    r = TestClient(app).get("/billing/success", params={"session_id": "cs_f"})
    assert "30 credits were added" in r.text and client.get("/api/auth/me").json()["usage"]["paid_credits"] == 30


# ---------------------------------------------------------------- credit is spent at generate
def test_failed_generation_costs_nothing(client, monkeypatch):
    client.post("/api/source/upload", files={"file": ("cv.txt", RESUME)})

    def boom(*a):
        raise RuntimeError("llm down")

    monkeypatch.setattr(apps_router, "tailor_resume", boom)
    assert client.post("/api/applications", json={"text": JD}).status_code == 502
    assert client.get("/api/auth/me").json()["usage"]["used"] == 0  # the reserved credit was given back
    assert client.get("/api/applications").json() == []


def test_credit_is_reserved_while_the_ai_is_working(client, monkeypatch):
    """A request that arrives while another is still generating must see that credit as taken."""
    client.post("/api/source/upload", files={"file": ("cv.txt", RESUME)})
    seen = {}

    def slow_tailor(*a):
        seen["used_midway"] = client.get("/api/auth/me").json()["usage"]["used"]
        seen["listed_midway"] = client.get("/api/applications").json()  # an unfinished resume is not shown
        return TailoredResume(name="Jane")

    monkeypatch.setattr(apps_router, "tailor_resume", slow_tailor)
    assert client.post("/api/applications", json={"text": JD}).status_code == 200
    assert seen["used_midway"] == 1 and seen["listed_midway"] == []


def test_parallel_requests_cannot_overspend(client, monkeypatch):
    client.post("/api/source/upload", files={"file": ("cv.txt", RESUME)})
    with SessionLocal() as db:
        db.add_all(Application(user_id=db.scalar(select(User)).id, job_description="jd", resume={}) for _ in range(9))
        db.commit()  # 9 of 10 spent: exactly one credit left
    results = []

    def racing_tailor(*a):
        results.append(client.post("/api/applications", json={"text": JD}).status_code)  # a second request mid-generation
        return TailoredResume(name="Jane")

    monkeypatch.setattr(apps_router, "tailor_resume", racing_tailor)
    assert client.post("/api/applications", json={"text": JD}).status_code == 200
    assert results == [402]  # the racing request was refused: the last credit was already reserved


def test_abandoned_reservations_expire(client):
    from datetime import timedelta
    from app.services.usage import utcnow

    with SessionLocal() as db:
        uid = db.scalar(select(User)).id
        db.add(Application(user_id=uid, job_description="jd", resume={}, status="generating", created_at=utcnow()))
        db.add(Application(user_id=uid, job_description="jd", resume={}, status="generating", created_at=utcnow() - timedelta(hours=1)))
        db.commit()
    assert client.get("/api/auth/me").json()["usage"]["used"] == 1  # the stale one (a crashed request) is ignored


# ---------------------------------------------------------------- website return page
def _fake_stripe_capturing(seen):
    class FakeSession:
        @staticmethod
        def create(**kw):
            seen.update(kw)
            return {"url": "https://checkout.stripe.com/x"}

    class FakeStripe:
        checkout = type("c", (), {"Session": FakeSession})

    return FakeStripe


def test_stripe_returns_to_the_website_when_site_url_is_set(client, monkeypatch):
    seen = {}
    monkeypatch.setattr(billing.settings, "STRIPE_SECRET_KEY", "sk_test_x")
    monkeypatch.setattr(billing, "_stripe", lambda: _fake_stripe_capturing(seen))
    monkeypatch.setattr(billing.settings, "SITE_URL", "https://applier.site/")
    monkeypatch.setattr(billing.settings, "PUBLIC_API_URL", "https://api.applier.site")
    assert client.post("/api/billing/checkout", json={"credits": 30}).status_code == 200
    assert seen["success_url"] == "https://applier.site/billing/success?session_id={CHECKOUT_SESSION_ID}"
    assert seen["cancel_url"] == "https://applier.site/billing/cancel"

    monkeypatch.setattr(billing.settings, "SITE_URL", "")  # no website configured: the API's own pages are used
    client.post("/api/billing/checkout", json={"credits": 30})
    assert seen["success_url"].startswith("https://api.applier.site/billing/success")


def test_confirm_endpoint_for_the_website(client, monkeypatch):
    monkeypatch.setattr(billing, "retrieve_session", lambda sid: paid_session(sid, 30))
    web = TestClient(app)  # the website calls this without any login
    r = web.get("/api/billing/confirm", params={"session_id": "cs_test_abc123"})
    assert r.status_code == 200 and r.json() == {"status": "paid", "credits_added": 30}
    assert web.get("/api/billing/confirm", params={"session_id": "cs_test_abc123"}).json() == {"status": "paid", "credits_added": 0}
    assert client.get("/api/auth/me").json()["usage"]["paid_credits"] == 30  # added once

    monkeypatch.setattr(billing, "retrieve_session", lambda sid: paid_session(sid, 30, status="unpaid"))
    assert web.get("/api/billing/confirm", params={"session_id": "cs_test_other1"}).json() == {"status": "pending", "credits_added": 0}

    assert web.get("/api/billing/confirm", params={"session_id": "not-a-session"}).status_code == 422

    def boom(sid):
        raise RuntimeError("stripe down")

    monkeypatch.setattr(billing, "retrieve_session", boom)
    assert web.get("/api/billing/confirm", params={"session_id": "cs_test_abc999"}).status_code == 502
