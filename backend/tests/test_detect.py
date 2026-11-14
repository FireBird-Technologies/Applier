import pytest

import app.services.detect as d
from app.schemas import DetectOut, PageIn

PAGE = PageIn(url="https://x.com/jobs/1", title="Backend Engineer", text="word " * 200)


@pytest.fixture(autouse=True)
def _patch(monkeypatch):
    monkeypatch.setattr(d.settings, "DETECTOR", "jev")
    monkeypatch.setattr(d, "extract_job_meta", lambda u, t, x: ("Backend Engineer", "Acme"))
    monkeypatch.setattr(d, "detect_job_page", lambda u, t, x: DetectOut(is_job=True, confidence=0.5, method="llm"))


def test_jev_yes_extracts_meta(monkeypatch):
    monkeypatch.setattr(d.jev, "job_probability", lambda *a: 0.93)
    out = d.detect(PAGE)
    assert (out.method, out.is_job, out.job_title, out.company) == ("jev", True, "Backend Engineer", "Acme")


def test_jev_no_skips_llm(monkeypatch):
    monkeypatch.setattr(d.jev, "job_probability", lambda *a: 0.04)
    monkeypatch.setattr(d, "extract_job_meta", lambda *a: pytest.fail("should not be called"))
    out = d.detect(PAGE)
    assert out.method == "jev" and out.is_job is False


def test_jev_error_falls_back_to_llm(monkeypatch):
    def boom(*a):
        raise RuntimeError("down")
    monkeypatch.setattr(d.jev, "job_probability", boom)
    assert d.detect(PAGE).method == "llm"


def test_auto_without_key_uses_llm(monkeypatch):
    monkeypatch.setattr(d.settings, "DETECTOR", "auto")
    monkeypatch.setattr(d.settings, "TYPESAFE_API_KEY", "")
    monkeypatch.setattr(d.jev, "job_probability", lambda *a: pytest.fail("jev should be off"))
    assert d.detect(PAGE).method == "llm"
