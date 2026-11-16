import app.services.detect as d
from app.dspy_modules import lm
from app.schemas import DetectOut, PageIn
from app.services.textclean import clean_text, trim_head_tail

JOB = "Backend Engineer at Acme. " + "You will build APIs in Python. " * 40


def test_structured_data_skips_llm(monkeypatch):
    monkeypatch.setattr(d, "detect_job_page", lambda *a: (_ for _ in ()).throw(AssertionError("no LLM")))
    out = d.detect(PageIn(text="", structured={"title": "SWE", "hiringOrganization": {"name": "Acme"}}))
    assert (out.method, out.job_title, out.company) == ("structured", "SWE", "Acme")


def test_short_page_skips_llm(monkeypatch):
    monkeypatch.setattr(d, "detect_job_page", lambda *a: (_ for _ in ()).throw(AssertionError("no LLM")))
    assert d.detect(PageIn(text="hello ​​ world")).is_job is False


def test_llm_receives_clean_trimmed_text(monkeypatch):
    seen = {}

    def fake(url, title, text, signals=""):
        seen.update(url=url, title=title, text=text, signals=signals)
        return DetectOut(is_job=True, confidence=0.9, method="llm")

    monkeypatch.setattr(d, "detect_job_page", fake)
    monkeypatch.setattr(d.settings, "DETECT_TEXT_CHARS", 1000)
    noisy = ("<div>Apply now \U0001F680</div>​ " + "x" * 80 + " https://track.example.com/a?b=1\n") + JOB * 20
    out = d.detect(PageIn(url="https://x.com/j", title="Job", text=noisy, signals="apply_buttons=1"))
    assert out.is_job
    assert len(seen["text"]) <= 1010  # ~limit (+ the "..." joiner)
    for bad in ("<div>", "​", "\U0001F680", "https://", "x" * 41):
        assert bad not in seen["text"]
    assert seen["signals"] == "apply_buttons=1"


POSTING = "Responsibilities\nBuild APIs.\nRequirements\n5 years of experience with Python.\nQualifications\nBS degree.\n"
NO = DetectOut(is_job=False, confidence=0.8, reason="Looks like a search page", method="llm")


def test_clear_posting_overrides_a_model_no(monkeypatch):
    monkeypatch.setattr(d, "detect_job_page", lambda *a: NO)
    text = "Jobs near you\n" + POSTING + "filler words here. " * 30
    out = d.detect(PageIn(text=text, signals="h1=Backend Engineer\napply_buttons=1\nresume_upload_field=false"))
    assert (out.is_job, out.job_title, out.method) == (True, "Backend Engineer", "llm")
    assert out.confidence == 0.5


def test_model_no_stands_without_clear_evidence(monkeypatch):
    monkeypatch.setattr(d, "detect_job_page", lambda *a: NO)
    filler = "filler words here. " * 30
    # job sections but no way to apply; a way to apply but no job sections; a list of jobs (many apply buttons)
    assert d.detect(PageIn(text=POSTING + filler, signals="apply_buttons=0\nresume_upload_field=false")).is_job is False
    assert d.detect(PageIn(text=filler, signals="apply_buttons=1")).is_job is False
    assert d.detect(PageIn(text=POSTING + filler, signals="apply_buttons=25")).is_job is False


def test_llm_sees_the_job_description_in_the_middle_of_a_long_page(monkeypatch):
    seen = {}

    def fake(url, title, text, signals=""):
        seen["text"] = text
        return DetectOut(is_job=True, confidence=0.9, method="llm")

    monkeypatch.setattr(d, "detect_job_page", fake)
    monkeypatch.setattr(d.settings, "DETECT_TEXT_CHARS", 1000)
    listing = "".join(f"Job card number {i} in the list on the left side of the page.\n" for i in range(80))
    footer = "".join(f"Footer link number {i} at the bottom of the page.\n" for i in range(40))
    d.detect(PageIn(text=listing + POSTING + footer))
    assert "Responsibilities" in seen["text"] and "Qualifications" in seen["text"]
    assert seen["text"].startswith("Job card number 0") and len(seen["text"]) <= 1010


def test_clean_text_readable_only():
    raw = "Hello &amp; welcome ​to\x00 <b>Acme</b> \U0001F389\nMenu\nMenu\nMenu\n\n\n\nBody https://a.co/x end"
    out = clean_text(raw)
    assert out == "Hello & welcome to Acme\nMenu\n\nBody end"


def test_trim_head_tail_keeps_both_ends():
    s = "START " + "mid " * 2000 + "END-APPLY"
    out = trim_head_tail(s, 500)
    assert out.startswith("START") and out.endswith("END-APPLY") and len(out) <= 510


def test_detector_lm_uses_reduced_budget(monkeypatch):
    lm._cache.clear()
    monkeypatch.setattr(lm.settings, "LLM_MODEL", "openai/big")
    monkeypatch.setattr(lm.settings, "DETECT_LLM_MODEL", "openai/small")
    monkeypatch.setattr(lm.settings, "LLM_API_KEY", "k")
    small, big = lm.get_detect_lm(), lm.get_lm()
    assert small.model == "openai/small" and small.kwargs["max_tokens"] == 600 and small.kwargs["temperature"] == 0.0
    assert big.model == "openai/big" and big.kwargs["max_tokens"] == lm.settings.LLM_MAX_TOKENS
    lm._cache.clear()


def test_detector_inherits_extra_body_only_for_same_model(monkeypatch):
    body = '{"reasoning_effort": "low"}'
    monkeypatch.setattr(lm.settings, "LLM_MODEL", "zai/glm-5.3")
    monkeypatch.setattr(lm.settings, "LLM_EXTRA_BODY", body)
    monkeypatch.setattr(lm.settings, "DETECT_LLM_EXTRA_BODY", "")

    monkeypatch.setattr(lm.settings, "DETECT_LLM_MODEL", "zai/glm-5.3")  # same model -> inherit
    lm._cache.clear()
    assert lm.get_detect_lm().kwargs["extra_body"] == {"reasoning_effort": "low"}

    monkeypatch.setattr(lm.settings, "DETECT_LLM_MODEL", "openai/gpt-4.1-mini")  # other provider -> don't leak
    lm._cache.clear()
    assert "extra_body" not in lm.get_detect_lm().kwargs
    lm._cache.clear()
