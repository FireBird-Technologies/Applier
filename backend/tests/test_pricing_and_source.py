import os

os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")
os.environ["UPDATE_EMAIL_SCHEDULER"] = "false"

import pytest
from fastapi.testclient import TestClient

import app.routers.applications as apps_router
import app.routers.sources as sources_router
import app.services.billing as billing
from app.auth import create_access_token
from app.database import Base, SessionLocal, engine
from app.main import app
from app.models.user import User
from app.schemas import Experience, TailoredResume

RESUME = ("Jane Doe, senior engineer with 8 years of Python and Postgres experience. " * 3).encode()
JD = "We are hiring a Backend Engineer. You will build APIs in Python. " * 5


# ---------------------------------------------------------------- pricing comes from settings
def test_pricing_endpoint_is_public_and_reads_settings(monkeypatch):
    s = billing.settings
    monkeypatch.setattr(s, "FREE_APPLICATIONS", 7)
    monkeypatch.setattr(s, "PRICE_PER_APPLICATION_USD", 0.25)
    monkeypatch.setattr(s, "MINIMUM_CHARGE_USD", 5.0)
    monkeypatch.setattr(s, "SUGGESTED_CREDITS", "10, 40,100, junk,99999")
    monkeypatch.setattr(s, "MAX_CREDITS_PER_PURCHASE", 500)
    r = TestClient(app).get("/api/pricing")  # no auth header
    assert r.status_code == 200
    assert r.json() == {"free_credits": 7, "price_per_application_usd": 0.25, "minimum_charge_usd": 5.0,
                        "min_credits": 20, "max_credits": 500, "suggested_credits": [20, 40, 100]}
    assert "max-age" in r.headers["cache-control"]


def test_changing_the_price_changes_what_checkout_charges_and_allows(monkeypatch):
    monkeypatch.setattr(billing.settings, "PRICE_PER_APPLICATION_USD", 0.5)
    monkeypatch.setattr(billing.settings, "MINIMUM_CHARGE_USD", 3.0)
    assert billing.min_credits() == 6
    assert billing.amount_cents(6) == 300 and billing.amount_cents(10) == 500
    monkeypatch.setattr(billing.settings, "MAX_CREDITS_PER_PURCHASE", 3)  # smaller than the minimum: never contradicts it
    assert billing.max_credits() == 6


# ---------------------------------------------------------------- source resume as an editable document
@pytest.fixture()
def env(monkeypatch):
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    calls = {"parse": 0, "revise": []}

    def fake_parse(text):
        calls["parse"] += 1
        return TailoredResume(name="Jane Doe", summary="Engineer.", skills=["Python"], section_order=[],  # model tries to pick a layout
                              experience=[Experience(company="Acme", title="Eng", bullets=["Built APIs"])])

    def fake_revise(source, current, jd, instruction, previous_edits=""):
        calls["revise"].append((jd, instruction, previous_edits))
        return current.model_copy(update={"summary": f"{current.summary}|{instruction.splitlines()[0]}"})

    seen_source = []
    monkeypatch.setattr(sources_router, "parse_resume", fake_parse)
    monkeypatch.setattr(sources_router, "revise_resume", fake_revise)
    monkeypatch.setattr(apps_router, "tailor_resume", lambda src, *a: seen_source.append(src) or TailoredResume(name="Jane"))
    with SessionLocal() as db:
        u = User(google_sub="g1", email="jane@x.com")
        db.add(u)
        db.commit()
        tok = create_access_token(u.id)
    c = TestClient(app, headers={"Authorization": f"Bearer {tok}"})
    return c, calls, seen_source


def test_source_doc_needs_a_source_then_parses_once(env):
    c, calls, _ = env
    assert c.get("/api/source/resume").status_code == 404
    c.post("/api/source/upload", files={"file": ("cv.txt", RESUME)})
    d = c.get("/api/source/resume").json()
    assert d["filename"] == "cv.txt" and d["resume"]["name"] == "Jane Doe" and d["can_undo"] is False
    assert d["resume"]["section_order"] == ["summary", "skills", "experience", "projects", "education", "certifications"]
    c.get("/api/source/resume")
    assert calls["parse"] == 1  # cached after the first view


def test_parse_failure_is_a_clean_error(env, monkeypatch):
    c, _, _ = env
    c.post("/api/source/upload", files={"file": ("cv.txt", RESUME)})
    monkeypatch.setattr(sources_router, "parse_resume", lambda t: (_ for _ in ()).throw(RuntimeError("llm down")))
    assert c.get("/api/source/resume").status_code == 502


def test_manual_edits_flow_back_into_the_text_used_for_tailoring(env):
    c, _, seen_source = env
    c.post("/api/source/upload", files={"file": ("cv.txt", RESUME)})
    doc = c.get("/api/source/resume").json()
    edited = {**doc["resume"], "name": "Jane Q. Doe", "summary": "Hand written summary.", "section_order": ["summary", "experience"]}
    out = c.put("/api/source/resume", json={"resume": edited}).json()
    assert out["resume"]["name"] == "Jane Q. Doe" and out["can_undo"] and out["last_edit"] == "your manual edits"

    c.post("/api/applications", json={"text": JD})
    text = seen_source[-1]
    assert "Jane Q. Doe" in text and "Hand written summary." in text and "Built APIs" in text
    assert "Python" not in text  # the skills section was removed from the layout, so tailoring never sees it


def test_source_ai_edit_keeps_layout_and_remembers_history_then_undo(env):
    c, calls, seen_source = env
    c.post("/api/source/upload", files={"file": ("cv.txt", RESUME)})
    doc = c.get("/api/source/resume").json()
    layout = ["experience", "summary"]
    c.put("/api/source/resume", json={"resume": {**doc["resume"], "section_order": layout}})

    d1 = c.post("/api/source/resume/edit", json={"instruction": "fix my title"}).json()
    assert d1["resume"]["section_order"] == layout  # the AI does not rearrange the user's sections
    assert d1["resume"]["summary"].endswith("|fix my title")
    jd, instruction, history = calls["revise"][0]
    assert "not a tailored one" in jd and "one-page limit does not apply" in instruction and history == "- (the user edited the text by hand)"
    c.post("/api/source/resume/edit", json={"instruction": "add a line"})
    assert calls["revise"][1][2] == "- (the user edited the text by hand)\n- fix my title"

    d3 = c.post("/api/source/resume/undo").json()
    assert d3["resume"]["summary"].endswith("|fix my title") and not d3["resume"]["summary"].endswith("add a line")
    c.post("/api/applications", json={"text": JD})
    assert "add a line" not in seen_source[-1]  # undo also reverts the text tailoring reads
    c.post("/api/source/resume/undo")
    c.post("/api/source/resume/undo")
    assert c.post("/api/source/resume/undo").status_code == 400


def test_uploading_a_new_resume_starts_a_fresh_document(env):
    c, calls, _ = env
    c.post("/api/source/upload", files={"file": ("a.txt", RESUME)})
    c.get("/api/source/resume")
    c.post("/api/source/upload", files={"file": ("b.txt", RESUME + b" more")})
    d = c.get("/api/source/resume").json()
    assert d["filename"] == "b.txt" and calls["parse"] == 2
