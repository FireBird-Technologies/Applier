import os

os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")
os.environ["UPDATE_EMAIL_SCHEDULER"] = "false"

import pytest
from sqlalchemy import select

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.models.user import User
from scripts.credits import main


@pytest.fixture(autouse=True)
def user(monkeypatch):
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    monkeypatch.setattr(settings, "FREE_APPLICATIONS", 10)  # settings load once per process
    with SessionLocal() as db:
        db.add(User(google_sub="g1", email="Jane@Example.com", paid_credits=30))
        db.commit()


def paid() -> int:
    with SessionLocal() as db:
        return db.scalar(select(User.paid_credits))


def test_show_is_case_insensitive_and_changes_nothing(capsys):
    assert main(["show", "jane@example.COM"]) == 0
    out = capsys.readouterr().out
    assert "40 credits left" in out and "10 free + 30 purchased" in out
    assert paid() == 30


def test_add_and_remove_after_a_refund(capsys):
    assert main(["add", "jane@example.com", "20"]) == 0 and paid() == 50
    assert main(["remove", "jane@example.com", "30"]) == 0 and paid() == 20
    assert "Removed 30 credits" in capsys.readouterr().out


def test_cannot_remove_more_than_was_purchased(capsys):
    assert main(["remove", "jane@example.com", "31"]) == 1
    assert "only 30 purchased credits" in capsys.readouterr().out
    assert paid() == 30  # untouched


def test_unknown_user_and_bad_amounts(capsys):
    assert main(["show", "nobody@example.com"]) == 1
    assert "No user with email" in capsys.readouterr().out
    assert main(["add", "jane@example.com", "0"]) == 1
    assert main(["add", "jane@example.com", "-5"]) == 1
    assert paid() == 30
