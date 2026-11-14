import os

os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")
os.environ["UPDATE_EMAIL_SCHEDULER"] = "false"

from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, delete, func, inspect, select

import app.main as main_module
from app.config import BACKEND_DIR, Settings, settings
from app.database import Base, SessionLocal, engine
from app.migrate import upgrade_to_head
from app.models.application import Application
from app.models.user import User

EXPECTED = {"users", "source_resumes", "applications", "update_emails", "update_email_sends", "payments", "alembic_version"}


def url(u: str) -> str:
    return Settings(DATABASE_URL=u).DATABASE_URL


def test_postgres_url_forms_get_an_explicit_driver():
    assert url("postgres://u:p@h:5432/db") == "postgresql+psycopg2://u:p@h:5432/db"
    assert url("postgresql://u:p@h/db?sslmode=require") == "postgresql+psycopg2://u:p@h/db?sslmode=require"
    assert url("postgresql+psycopg2://u:p@h/db") == "postgresql+psycopg2://u:p@h/db"


def test_relative_sqlite_path_does_not_depend_on_working_directory(tmp_path, monkeypatch):
    here = url("sqlite:///./dev.db")
    monkeypatch.chdir(tmp_path)  # start the server from anywhere
    assert url("sqlite:///./dev.db") == here == "sqlite:///" + (BACKEND_DIR / "dev.db").as_posix()


def test_absolute_and_memory_sqlite_urls_are_untouched(tmp_path):
    absolute = "sqlite:///" + (tmp_path / "a.db").as_posix()
    assert url(absolute) == absolute
    assert url("sqlite:///:memory:") == "sqlite:///:memory:"


def test_auto_migrate_defaults_on_for_sqlite_only():
    assert Settings(DATABASE_URL="sqlite:///./x.db").auto_migrate is True
    assert Settings(DATABASE_URL="postgres://u:p@h/db").auto_migrate is False
    assert Settings(DATABASE_URL="postgres://u:p@h/db", AUTO_MIGRATE=True).auto_migrate is True
    assert Settings(DATABASE_URL="sqlite:///./x.db", AUTO_MIGRATE=False).auto_migrate is False


def test_upgrade_to_head_builds_an_empty_sqlite_database(tmp_path, monkeypatch):
    path = tmp_path / "fresh.db"
    monkeypatch.setattr(settings, "DATABASE_URL", f"sqlite:///{path.as_posix()}")
    upgrade_to_head()
    assert EXPECTED <= set(inspect(create_engine(settings.DATABASE_URL)).get_table_names())
    upgrade_to_head()  # running it again is a no-op


@pytest.mark.parametrize("auto,expected_calls", [(True, 1), (False, 0)])
def test_server_start_migrates_when_enabled(monkeypatch, auto, expected_calls):
    calls = []
    monkeypatch.setattr(main_module, "upgrade_to_head", lambda: calls.append(1))
    monkeypatch.setattr(settings, "AUTO_MIGRATE", auto)
    monkeypatch.setattr(settings, "UPDATE_EMAIL_SCHEDULER", False)
    with TestClient(main_module.app) as c:
        assert c.get("/api/health").status_code == 200
    assert len(calls) == expected_calls


def test_sqlite_enforces_cascade_deletes_like_postgres():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        u = User(google_sub="g", email="a@b.c")
        db.add(u)
        db.flush()
        db.add(Application(user_id=u.id, job_description="jd", resume={}))
        db.commit()
        db.execute(delete(User))  # plain SQL delete: only the database's own ON DELETE CASCADE can clean up
        db.commit()
        assert db.scalar(select(func.count(Application.id))) == 0
