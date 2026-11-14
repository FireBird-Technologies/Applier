import os

os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")
os.environ["UPDATE_EMAIL_SCHEDULER"] = "false"

import logging
import re
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import app.main as main_module
from app.config import Settings, settings

POSTGRES = "postgresql+psycopg2://u:p@h/db"
# Importing the AI library loads backend/.env into the process environment, so these tests must never rely on defaults:
# every required value is stated, empty or not.
EMPTY = dict(JWT_SECRET="change-me", GOOGLE_CLIENT_ID="", LLM_API_KEY="", RESEND_API_KEY="", STRIPE_SECRET_KEY="",
             STRIPE_WEBHOOK_SECRET="", PUBLIC_API_URL="http://localhost:8000")
GOOD = dict(JWT_SECRET="a-real-secret", GOOGLE_CLIENT_ID="g", LLM_API_KEY="k", RESEND_API_KEY="r",
            STRIPE_SECRET_KEY="sk", STRIPE_WEBHOOK_SECRET="wh", PUBLIC_API_URL="https://api.example.org")


def problems(**kw):
    return Settings(_env_file=None, **{**EMPTY, **kw}).startup_problems()


def test_postgres_refuses_the_placeholder_secret():
    fatal, _ = problems(DATABASE_URL=POSTGRES)
    assert len(fatal) == 1 and "JWT_SECRET" in fatal[0]
    assert problems(DATABASE_URL=POSTGRES, **GOOD)[0] == []


def test_sqlite_dev_is_allowed_the_placeholder_secret():
    assert problems(DATABASE_URL="sqlite:///./x.db")[0] == []


def test_every_missing_required_setting_is_named_in_a_warning():
    _, warnings = problems(DATABASE_URL=POSTGRES, JWT_SECRET="x")  # everything else empty
    text = " ".join(warnings)
    for name in ("GOOGLE_CLIENT_ID", "LLM_API_KEY", "RESEND_API_KEY", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "PUBLIC_API_URL"):
        assert name in text, name
    assert problems(DATABASE_URL=POSTGRES, **GOOD)[1] == []  # all set: nothing to say


def test_the_app_will_not_start_with_a_fatal_problem(monkeypatch):
    monkeypatch.setattr(settings, "DATABASE_URL", POSTGRES)  # the engine already exists; startup only reads the setting
    monkeypatch.setattr(settings, "JWT_SECRET", "change-me")
    monkeypatch.setattr(settings, "AUTO_MIGRATE", False)
    monkeypatch.setattr(settings, "UPDATE_EMAIL_SCHEDULER", False)
    with pytest.raises(RuntimeError, match="JWT_SECRET"):
        with TestClient(main_module.app):
            pass


def test_startup_logs_the_warnings(monkeypatch, caplog):
    monkeypatch.setattr(settings, "AUTO_MIGRATE", False)
    monkeypatch.setattr(settings, "UPDATE_EMAIL_SCHEDULER", False)
    monkeypatch.setattr(settings, "LLM_API_KEY", "")
    with caplog.at_level(logging.WARNING):
        with TestClient(main_module.app) as c:
            assert c.get("/api/health").json() == {"ok": True, "model": settings.LLM_MODEL}
    assert any("LLM_API_KEY is not set" in r.message for r in caplog.records)


def test_the_templates_only_list_required_and_adjustable_settings():
    """Fixed defaults must stay out of the production template, and every listed name must be a real setting."""
    root = Path(__file__).resolve().parents[2]
    allowed = {
        "DATABASE_URL", "JWT_SECRET", "GOOGLE_CLIENT_ID", "LLM_API_KEY", "RESEND_API_KEY", "STRIPE_SECRET_KEY",
        "STRIPE_WEBHOOK_SECRET", "PUBLIC_API_URL", "SITE_URL",
        "FREE_APPLICATIONS", "PRICE_PER_APPLICATION_USD", "MINIMUM_CHARGE_USD",
        "LLM_MODEL", "LLM_API_BASE", "LLM_EXTRA_BODY", "DETECT_LLM_MODEL", "DETECT_LLM_API_KEY", "DETECT_LLM_API_BASE",
        "DETECT_LLM_EXTRA_BODY", "EMAIL_FROM", "EMAIL_REPLY_TO", "UPDATE_EMAIL_FROM",
    }
    for template in (root / "deploy" / "backend.env.production.example", root / "backend" / ".env.example"):
        names = set(re.findall(r"^([A-Z_]+)=", template.read_text(encoding="utf-8"), re.M))
        assert names == allowed, (template.name, names ^ allowed)
        assert names <= set(Settings.model_fields)  # no stale names
