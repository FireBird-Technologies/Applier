import os

os.environ["DATABASE_URL"] = "sqlite:///./test.db"
os.environ["FREE_APPLICATIONS"] = "2"
os.environ["UPDATE_EMAIL_SCHEDULER"] = "false"

from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

import app.services.email as email
import app.services.updates as updates
from app.database import Base, SessionLocal, engine
from app.main import app
from app.models.application import Application
from app.models.update_email import UpdateEmail, UpdateEmailSend
from app.models.user import User


@pytest.fixture()
def db(monkeypatch):
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    monkeypatch.setattr(email.settings, "RESEND_API_KEY", "re_test")
    with SessionLocal() as s:
        yield s


@pytest.fixture()
def sent(monkeypatch):
    calls: list[dict] = []
    monkeypatch.setattr(email, "_send_via_resend", lambda p: calls.append(p) or "id")
    return calls


def add_users(db, n, applied=None):
    users = []
    for i in range(n):
        u = User(google_sub=f"g{i}", email=f"u{i}@x.com", name=f"User {i}")
        db.add(u)
        db.flush()
        for _ in range((applied or {}).get(i, 0)):
            db.add(Application(user_id=u.id, job_description="jd", resume={}, status="applied"))
        users.append(u)
    db.commit()
    return users


def campaign(db, **kw):
    c = UpdateEmail(subject="What's new", body="We shipped <b>stuff</b>", **kw)
    db.add(c)
    db.commit()
    return c


def test_drips_in_batches_until_complete(db, sent):
    add_users(db, 5)
    c = campaign(db, batch_size=2)
    assert updates.run_batch(db, c.id, throttle=0) == 2
    assert c.status == "running" and c.total_users == 5 and c.sent_count == 2
    updates.run_batch(db, c.id, throttle=0)
    updates.run_batch(db, c.id, throttle=0)
    assert c.status == "completed" and c.sent_count == 5
    assert len({m["to"][0] for m in sent}) == 5  # nobody twice
    assert updates.run_batch(db, c.id, throttle=0) == 0  # completed campaigns are inert


def test_email_content_escaped_with_unsubscribe(db, sent):
    add_users(db, 1)
    updates.run_batch(db, campaign(db).id, throttle=0)
    m = sent[0]
    assert "<b>stuff</b>" not in m["html"] and "&lt;b&gt;stuff&lt;/b&gt;" in m["html"]
    assert "/unsubscribe?email=u0%40x.com&token=" in m["text"]
    assert m["headers"]["List-Unsubscribe-Post"] == "List-Unsubscribe=One-Click"


def test_filters(db, sent):
    add_users(db, 4, applied={0: 1, 1: 2, 2: 0, 3: 0})
    for flt, expected in [("all", 4), ("active", 2), ("inactive", 2), ("exhausted", 1)]:
        c = campaign(db, user_filter=flt)
        updates.run_batch(db, c.id, throttle=0)
        assert c.total_users == expected, flt


def test_failed_send_is_recorded_not_retried(db, monkeypatch):
    add_users(db, 2)
    monkeypatch.setattr(email, "_send_via_resend", lambda p: (_ for _ in ()).throw(RuntimeError("down")))
    c = campaign(db)
    updates.run_batch(db, c.id, throttle=0)
    assert (c.sent_count, c.failed_count, c.status) == (0, 2, "completed")
    assert {r.status for r in db.scalars(select(UpdateEmailSend))} == {"failed"}


def test_already_claimed_user_is_skipped(db, sent):
    users = add_users(db, 2)
    c = campaign(db)
    db.add(UpdateEmailSend(update_email_id=c.id, user_id=users[0].id, status="sent"))  # another worker got there
    db.commit()
    assert updates.run_batch(db, c.id, throttle=0) == 1
    assert [m["to"][0] for m in sent] == ["u1@x.com"]


def test_unsubscribe_flow(db, sent):
    add_users(db, 2)
    client = TestClient(app)
    assert client.get("/unsubscribe", params={"email": "u0@x.com", "token": "bad"}).status_code == 400
    tok = updates.unsubscribe_token("U0@x.com")  # case-insensitive
    assert client.get("/unsubscribe", params={"email": "u0@x.com", "token": tok}).status_code == 200
    assert client.post("/unsubscribe", params={"email": "u1@x.com", "token": updates.unsubscribe_token("u1@x.com")}).status_code == 200
    db.expire_all()
    assert all(u.email_unsubscribed for u in db.scalars(select(User)))
    updates.run_batch(db, campaign(db).id, throttle=0)
    assert sent == []


def test_scheduler_respects_hour_and_runs_once_per_day(db, sent, monkeypatch):
    monkeypatch.setattr(updates.settings, "UPDATE_EMAIL_SEND_HOUR", 9)
    add_users(db, 4)
    c = campaign(db, batch_size=2)
    day = datetime(2026, 11, 14)
    assert updates.run_due_batches(db, day.replace(hour=8), throttle=0) == 0  # wrong hour
    assert updates.run_due_batches(db, datetime.utcnow().replace(hour=9, minute=5), throttle=0) == 2
    assert updates.run_due_batches(db, datetime.utcnow().replace(hour=9, minute=40), throttle=0) == 0  # same day
    tomorrow = datetime.utcnow() + timedelta(days=1)
    assert updates.run_due_batches(db, tomorrow.replace(hour=9, minute=0), throttle=0) == 2
    db.refresh(c)
    assert c.status == "completed"
