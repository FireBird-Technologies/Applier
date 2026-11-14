import os
os.environ["DATABASE_URL"] = "sqlite:///./test.db"
os.environ["FREE_APPLICATIONS"] = "2"

import pytest
from fastapi.testclient import TestClient

from app.database import Base, SessionLocal, engine
from app.main import app
from app.models.user import User
from app.auth import create_access_token
from app.schemas import DetectOut, TailoredResume
import app.routers.applications as apps_router
import app.services.detect as detect_service

RESUME = "Jane Doe\njane@example.com\nSenior engineer with 8 years of Python and Postgres experience. " * 3
JD = "We are hiring a Backend Engineer. You will build APIs in Python and FastAPI. " * 5


def fake_tailor(source, title, company, jd):
    return TailoredResume(name="Jane Doe", headline=title, contact=["jane@example.com"], summary="s",
                          skills=["Python"], certifications=["AWS"])


@pytest.fixture()
def client(monkeypatch):
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    monkeypatch.setattr(apps_router, "tailor_resume", fake_tailor)
    monkeypatch.setattr(apps_router, "revise_resume", lambda s, c, j, i, h="": c.model_copy(update={"summary": i}))
    monkeypatch.setattr(detect_service, "detect_job_page",
                        lambda u, t, x, s="": DetectOut(is_job=True, confidence=0.8, job_title="X", company="Y"))
    with SessionLocal() as db:
        u = User(google_sub="g1", email="a@b.c", name="A")
        db.add(u)
        db.commit()
        token = create_access_token(u.id)
    c = TestClient(app)
    c.headers["Authorization"] = f"Bearer {token}"
    return c


def test_requires_auth():
    assert TestClient(app).get("/api/source").status_code == 401


def test_full_flow_and_quota(client):
    assert client.post("/api/applications", json={"text": JD}).status_code == 400  # no source yet
    r = client.post("/api/source/upload", files={"file": ("cv.txt", RESUME.encode())})
    assert r.status_code == 200, r.text

    d = client.post("/api/detect", json={"url": "u", "title": "t", "text": JD * 5}).json()
    assert d["is_job"] and d["method"] == "llm"
    s = client.post("/api/detect", json={"text": "", "structured": {"title": "SWE", "hiringOrganization": {"name": "Acme"}}}).json()
    assert s["method"] == "structured" and s["company"] == "Acme"
    assert client.post("/api/detect", json={"text": "short"}).json()["is_job"] is False

    usage = lambda: client.get("/api/auth/me").json()["usage"]
    assert usage()["used"] == 0
    ids = []
    for n in (1, 2):  # FREE_APPLICATIONS is 2 in these tests
        r = client.post("/api/applications", json={"url": "u", "job_title": "BE", "company": "Acme", "text": JD})
        assert r.status_code == 200, r.text
        ids.append(r.json()["id"])
        assert r.json()["status"] == "draft"
        assert usage()["used"] == n  # generating is what spends the credit
    assert usage()["paywalled"] and usage()["remaining"] == 0
    assert client.post("/api/applications", json={"text": JD}).status_code == 402  # out of credits: no new resume

    # ...but everything on the resumes you already made is free and unlimited, even at zero credits
    for i in range(4):
        e = client.post(f"/api/applications/{ids[0]}/edit", json={"instruction": f"change {i}"})
        assert e.status_code == 200 and e.json()["version"] == i + 2
    assert client.post(f"/api/applications/{ids[0]}/undo").status_code == 200
    for fmt, magic in [("pdf", b"%PDF"), ("docx", b"PK"), ("md", b"# Jane"), ("txt", b"JANE")]:
        r = client.get(f"/api/applications/{ids[0]}/download?format={fmt}")
        assert r.status_code == 200 and r.content.startswith(magic), fmt
    assert client.get(f"/api/applications/{ids[1]}/download").status_code == 200
    assert usage()["used"] == 2  # edits, undo and downloads never used another credit
    assert client.get(f"/api/applications/{ids[0]}").json()["status"] == "applied"  # still tracks that it was downloaded


def test_other_users_cannot_access(client):
    client.post("/api/source/upload", files={"file": ("cv.txt", RESUME.encode())})
    aid = client.post("/api/applications", json={"text": JD}).json()["id"]
    with SessionLocal() as db:
        u = User(google_sub="g2", email="x@y.z")
        db.add(u); db.commit()
        tok = create_access_token(u.id)
    other = TestClient(app)
    assert other.get(f"/api/applications/{aid}", headers={"Authorization": f"Bearer {tok}"}).status_code == 404


def test_dspy_structured_output():
    """The real DSPy signatures should parse a structured TailoredResume from an LM reply."""
    import dspy
    from dspy.utils import DummyLM
    from app.dspy_modules import modules

    reply = {"reasoning": "ok", "resume": TailoredResume(name="Jane").model_dump_json()}
    lm = DummyLM([reply])
    modules.get_lm = lambda: lm
    out = modules.tailor_resume(RESUME, "BE", "Acme", JD)
    assert out.name == "Jane"
