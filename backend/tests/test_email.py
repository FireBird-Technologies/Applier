import os

os.environ["DATABASE_URL"] = "sqlite:///./test.db"
os.environ["FREE_APPLICATIONS"] = "2"

import pytest
from fastapi.testclient import TestClient

import app.routers.auth as auth_router
import app.routers.applications as apps_router
import app.services.email as email
from app.auth import create_access_token
from app.database import Base, SessionLocal, engine
from app.main import app
from app.models.user import User
from app.schemas import TailoredResume

RESUME = ("Jane Doe, senior engineer with 8 years of Python and Postgres experience. " * 3).encode()
JD = "We are hiring a Backend Engineer. You will build APIs in Python. " * 5


@pytest.fixture()
def sent(monkeypatch):
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    monkeypatch.setattr(email.settings, "RESEND_API_KEY", "re_test")
    calls: list[dict] = []
    monkeypatch.setattr(email, "_send_via_resend", lambda p: calls.append(p) or "id1")
    monkeypatch.setattr(apps_router, "tailor_resume", lambda *a: TailoredResume(name="Jane"))
    return calls


def test_no_key_skips_without_error(monkeypatch):
    monkeypatch.setattr(email.settings, "RESEND_API_KEY", "")
    monkeypatch.setattr(email, "_send_via_resend", lambda p: pytest.fail("must not send"))
    assert email.send_welcome("a@b.c", "Jane") is False


def test_provider_failure_never_raises(monkeypatch):
    monkeypatch.setattr(email.settings, "RESEND_API_KEY", "re_test")

    def boom(p):
        raise RuntimeError("resend down")

    monkeypatch.setattr(email, "_send_via_resend", boom)
    assert email.send_welcome("a@b.c") is False


def test_welcome_only_on_first_signin(sent, monkeypatch):
    monkeypatch.setattr(auth_router.id_token, "verify_oauth2_token",
                        lambda *a, **k: {"sub": "g1", "email": "jane@x.com", "name": "Jane Doe", "email_verified": True})
    monkeypatch.setattr(auth_router.settings, "GOOGLE_CLIENT_ID", "cid")
    c = TestClient(app)
    assert c.post("/api/auth/google", json={"credential": "t"}).status_code == 200
    assert c.post("/api/auth/google", json={"credential": "t"}).status_code == 200
    assert len(sent) == 1
    assert sent[0]["to"] == ["jane@x.com"] and sent[0]["subject"] == "Welcome to Applier"
    assert "Hi Jane," in sent[0]["text"]


def test_quota_email_sent_once_on_last_free_download(sent):
    with SessionLocal() as db:
        u = User(google_sub="g1", email="jane@x.com")
        db.add(u)
        db.commit()
        tok = create_access_token(u.id)
    c = TestClient(app, headers={"Authorization": f"Bearer {tok}"})
    c.post("/api/source/upload", files={"file": ("cv.txt", RESUME)})
    ids = [c.post("/api/applications", json={"text": JD}).json()["id"] for _ in range(2)]

    c.get(f"/api/applications/{ids[0]}/download")
    assert sent == []  # 1 of 2 used
    c.get(f"/api/applications/{ids[1]}/download")
    c.get(f"/api/applications/{ids[1]}/download")  # re-download must not re-send
    assert [m["subject"] for m in sent] == ["You're out of Applier credits"]
