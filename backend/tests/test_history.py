import os

os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")
os.environ["UPDATE_EMAIL_SCHEDULER"] = "false"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, select

import app.routers.applications as apps_router
from app.auth import create_access_token
from app.database import Base, SessionLocal, engine
from app.main import app
from app.models.application import Application, ApplicationEdit
from app.models.user import User
from app.schemas import TailoredResume

RESUME = ("Jane Doe, senior engineer with 8 years of Python and Postgres experience. " * 3).encode()
JD = "We are hiring a Backend Engineer. You will build APIs in Python. " * 5


@pytest.fixture()
def env(monkeypatch):
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    seen: list[str] = []  # the edit history the reviser was given on each AI edit

    def fake_revise(source, current, jd, instruction, previous_edits=""):
        seen.append(previous_edits)
        return current.model_copy(update={"summary": f"{current.summary}|{instruction}".strip("|")})

    monkeypatch.setattr(apps_router, "tailor_resume", lambda *a: TailoredResume(name="Jane", summary="orig"))
    monkeypatch.setattr(apps_router, "revise_resume", fake_revise)
    with SessionLocal() as db:
        u = User(google_sub="g1", email="jane@x.com", name="Jane")
        db.add(u)
        db.commit()
        tok = create_access_token(u.id)
    c = TestClient(app, headers={"Authorization": f"Bearer {tok}"})
    c.post("/api/source/upload", files={"file": ("cv.txt", RESUME)})
    aid = c.post("/api/applications", json={"text": JD}).json()
    return c, aid, seen


def edit(c, aid, text):
    r = c.post(f"/api/applications/{aid['id']}/edit", json={"instruction": text})
    assert r.status_code == 200, r.text
    return r.json()


def test_generated_resume_has_nothing_to_undo(env):
    _, aid, _ = env
    assert aid["can_undo"] is False and aid["last_edit"] == ""


def test_each_edit_is_given_all_earlier_requests(env):
    c, aid, seen = env
    edit(c, aid, "shorten the summary")
    edit(c, aid, "add a skills line")
    edit(c, aid, "mention Postgres")
    assert seen[0] == ""
    assert seen[1] == "- shorten the summary"
    assert seen[2] == "- shorten the summary\n- add a skills line"


def test_manual_edits_are_remembered_too(env):
    c, aid, seen = env
    edit(c, aid, "shorten the summary")
    c.put(f"/api/applications/{aid['id']}", json={"resume": {"name": "Jane", "summary": "my own words"}})
    edit(c, aid, "add a skills line")
    assert seen[1] == "- shorten the summary\n- (the user edited the text by hand)"


def test_undo_steps_back_one_edit_at_a_time(env):
    c, aid, _ = env
    a1 = edit(c, aid, "first change")
    a2 = edit(c, aid, "second change")
    assert a2["can_undo"] and a2["last_edit"] == "second change" and a2["resume"]["summary"] == "orig|first change|second change"

    u1 = c.post(f"/api/applications/{aid['id']}/undo").json()
    assert u1["resume"]["summary"] == "orig|first change" and u1["last_edit"] == "first change" and u1["version"] > a2["version"]
    u2 = c.post(f"/api/applications/{aid['id']}/undo").json()
    assert u2["resume"]["summary"] == "orig" and u2["can_undo"] is False
    assert c.post(f"/api/applications/{aid['id']}/undo").status_code == 400  # back at the generated version
    assert c.get(f"/api/applications/{aid['id']}").json()["resume"]["summary"] == "orig"  # persisted
    assert a1["can_undo"]


def test_undone_request_is_forgotten_not_reapplied(env):
    c, aid, seen = env
    edit(c, aid, "make it spicy")
    c.post(f"/api/applications/{aid['id']}/undo")
    edit(c, aid, "add a skills line")
    assert seen[-1] == ""  # "make it spicy" was undone, so the reviser is not told to keep it


def test_undo_manual_edit_restores_previous_text(env):
    c, aid, _ = env
    edit(c, aid, "first change")
    c.put(f"/api/applications/{aid['id']}", json={"resume": {"name": "Jane", "summary": "hand written"}})
    out = c.get(f"/api/applications/{aid['id']}").json()
    assert out["resume"]["summary"] == "hand written" and out["last_edit"] == "your manual edits"
    assert c.post(f"/api/applications/{aid['id']}/undo").json()["resume"]["summary"] == "orig|first change"


def test_resume_created_before_history_existed_still_undoes(env):
    c, aid, _ = env
    with SessionLocal() as db:  # simulate a row from before this feature: no history at all
        db.execute(delete(ApplicationEdit))
        db.commit()
    assert c.get(f"/api/applications/{aid['id']}").json()["can_undo"] is False
    edit(c, aid, "first change")
    out = c.post(f"/api/applications/{aid['id']}/undo").json()
    assert out["resume"]["summary"] == "orig"  # baseline was captured before the first edit


def test_history_is_private_and_deleted_with_the_resume(env):
    c, aid, _ = env
    edit(c, aid, "first change")
    with SessionLocal() as db:
        other = User(google_sub="g2", email="x@y.z")
        db.add(other)
        db.commit()
        tok = create_access_token(other.id)
    assert TestClient(app).post(f"/api/applications/{aid['id']}/undo", headers={"Authorization": f"Bearer {tok}"}).status_code == 404
    with SessionLocal() as db:
        db.execute(delete(Application))  # plain SQL delete: the database's cascade must clear the history
        db.commit()
        assert db.scalars(select(ApplicationEdit)).all() == []


def test_rating_a_generated_resume(env):
    c, aid, _ = env
    assert aid["feedback"] is None
    r = c.put(f"/api/applications/{aid['id']}/feedback", json={"rating": "up"})
    assert r.status_code == 200 and r.json()["feedback"] == "up"
    assert c.put(f"/api/applications/{aid['id']}/feedback", json={"rating": "down"}).json()["feedback"] == "down"  # change of mind
    assert c.get(f"/api/applications/{aid['id']}").json()["feedback"] == "down"  # persisted
    assert c.get("/api/applications").json()[0]["feedback"] == "down"
    cleared = c.put(f"/api/applications/{aid['id']}/feedback", json={"rating": None}).json()
    assert cleared["feedback"] is None


def test_rating_survives_edits_and_undo(env):
    c, aid, _ = env
    c.put(f"/api/applications/{aid['id']}/feedback", json={"rating": "up"})
    edit(c, aid, "tweak")
    assert c.post(f"/api/applications/{aid['id']}/undo").json()["feedback"] == "up"


def test_rating_validation_and_privacy(env):
    c, aid, _ = env
    assert c.put(f"/api/applications/{aid['id']}/feedback", json={"rating": "meh"}).status_code == 422
    assert c.put(f"/api/applications/{aid['id']}/feedback", json={}).status_code == 422
    with SessionLocal() as db:
        other = User(google_sub="g9", email="o@y.z")
        db.add(other)
        db.commit()
        tok = create_access_token(other.id)
    r = TestClient(app).put(f"/api/applications/{aid['id']}/feedback", json={"rating": "down"}, headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 404
    assert c.get(f"/api/applications/{aid['id']}").json()["feedback"] is None  # untouched


def test_feedback_report_script(env, capsys):
    c, aid, _ = env
    c.put(f"/api/applications/{aid['id']}/feedback", json={"rating": "down"})
    from scripts.feedback import main
    import sys
    sys.argv = ["feedback"]
    main()
    out = capsys.readouterr().out
    assert "rated: 1" in out and "thumbs down: 1" in out and f"#{aid['id']}" in out
