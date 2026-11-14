import os

os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")
os.environ["UPDATE_EMAIL_SCHEDULER"] = "false"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

import app.routers.auth as auth_router
from app.auth import create_access_token
from app.database import Base, SessionLocal, engine
from app.main import app
from app.models.device import Device
from app.models.user import User
from app.services.devices import DEVICE_IN_USE_MSG

D1, D2, D3 = "browser-one-aaaaaaaaaaaaaaaa", "browser-two-bbbbbbbbbbbbbbbb", "browser-three-cccccccccccccc"


@pytest.fixture()
def env(monkeypatch):
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    monkeypatch.setattr(auth_router.settings, "REQUIRE_DEVICE_ID", True)
    monkeypatch.setattr(auth_router.settings, "GOOGLE_CLIENT_ID", "cid")
    google = {"sub": "gA", "email": "a@x.com", "name": "A", "email_verified": True}
    monkeypatch.setattr(auth_router.id_token, "verify_oauth2_token", lambda *a, **k: dict(google))

    def login(sub, email, device):
        google.update(sub=sub, email=email)
        headers = {"X-Device-Id": device} if device else {}
        return TestClient(app).post("/api/auth/google", json={"credential": "t"}, headers=headers)

    return login


def users():
    with SessionLocal() as db:
        return [u.email for u in db.scalars(select(User).order_by(User.id))]


def test_first_account_claims_the_browser(env):
    assert env("gA", "a@x.com", D1).status_code == 200
    with SessionLocal() as db:
        row = db.scalar(select(Device))
        assert row.device_hash != D1 and len(row.device_hash) == 64  # only a keyed hash is stored


def test_second_account_on_the_same_browser_is_refused_and_not_created(env):
    env("gA", "a@x.com", D1)
    r = env("gB", "b@x.com", D1)
    assert r.status_code == 403 and r.json()["detail"] == DEVICE_IN_USE_MSG
    assert users() == ["a@x.com"]  # the refused account was never created, so it got no free credits


def test_same_account_can_use_more_than_one_browser(env):
    assert env("gA", "a@x.com", D1).status_code == 200
    assert env("gA", "a@x.com", D2).status_code == 200
    assert env("gA", "a@x.com", D1).status_code == 200  # and sign in again on the first


def test_existing_account_cannot_sign_in_on_someone_elses_browser(env):
    env("gA", "a@x.com", D1)
    env("gB", "b@x.com", D2)
    assert env("gB", "b@x.com", D1).status_code == 403
    assert users() == ["a@x.com", "b@x.com"]


def test_requests_are_tied_to_the_browser(env):
    env("gA", "a@x.com", D1)
    with SessionLocal() as db:
        a = db.scalar(select(User).where(User.email == "a@x.com"))
        b = User(google_sub="gB", email="b@x.com")  # an account that existed before this rule
        db.add(b)
        db.commit()
        ta, tb = create_access_token(a.id), create_access_token(b.id)
    c = TestClient(app)
    ok = lambda tok, dev: c.get("/api/auth/me", headers={"Authorization": f"Bearer {tok}", "X-Device-Id": dev}).status_code
    assert ok(ta, D1) == 200
    assert ok(tb, D1) == 403   # B's token on A's browser
    assert ok(tb, D3) == 200   # B claims their own browser on first use
    assert ok(tb, D3) == 200
    assert ok(ta, D3) == 403   # and now A cannot use B's browser


def test_missing_or_malformed_browser_id_is_rejected_when_required(env):
    assert env("gA", "a@x.com", None).status_code == 400
    assert env("gA", "a@x.com", "short").status_code == 400
    with SessionLocal() as db:
        u = User(google_sub="gZ", email="z@x.com")
        db.add(u)
        db.commit()
        tok = create_access_token(u.id)
    r = TestClient(app).get("/api/auth/me", headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 400


def test_rule_can_be_switched_off(env, monkeypatch):
    monkeypatch.setattr(auth_router.settings, "REQUIRE_DEVICE_ID", False)
    assert env("gA", "a@x.com", None).status_code == 200
