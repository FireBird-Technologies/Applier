"""Job-page detection: structured data -> cheap heuristic -> small, cheap LLM call on trimmed text.

Tuned to avoid missing real job postings: a wrong "yes" costs the user one click ("Not a job?"), a wrong "no"
hides the product."""
import re

from app.config import settings
from app.dspy_modules.modules import detect_job_page
from app.schemas import DetectOut, PageIn
from app.services.textclean import clean_text, trim, trim_focus

MIN_TEXT = 300

# Headings and phrases that job descriptions use and search/listing pages mostly do not.
_SECTIONS = re.compile(
    r"\b(responsibilities|requirements|qualifications|what you(?:'|’)ll do|what you will do|about the (?:role|job|position)"
    r"|who you are|what we(?:'|’)re looking for|nice to have|preferred skills|years of experience|job description"
    r"|key duties|how to apply|equal opportunity)\b",
    re.I,
)
_APPLY = re.compile(r"apply_buttons=[1-3]\b|resume_upload_field=true")  # many apply buttons means a list of jobs
_H1 = re.compile(r"^h1=(.+)$", re.M)


def _org(v) -> str:
    return str(v.get("name", "")) if isinstance(v, dict) else str(v or "")


def looks_like_posting(text: str, signals: str) -> bool:
    """A way to apply plus at least three different job-description sections."""
    return bool(_APPLY.search(signals or "")) and len({m.group(0).lower() for m in _SECTIONS.finditer(text)}) >= 3


def detect(page: PageIn) -> DetectOut:
    s = page.structured
    if s and s.get("title"):  # schema.org JobPosting JSON-LD found by the extension
        return DetectOut(
            is_job=True, confidence=0.98, job_title=str(s.get("title", "")),
            company=_org(s.get("hiringOrganization")),
            reason="Page has JobPosting structured data", method="structured",
        )
    text = clean_text(page.text)
    if len(text) < MIN_TEXT:
        return DetectOut(is_job=False, confidence=0.9, reason="Page has too little text", method="heuristic")
    out = detect_job_page(
        trim(clean_text(page.url), 300),
        trim(clean_text(page.title), 200),
        trim_focus(text, settings.DETECT_TEXT_CHARS, _SECTIONS),
        trim(clean_text(page.signals), 600),
    )
    if not out.is_job and looks_like_posting(text, page.signals):  # the model said no against clear evidence
        h1 = _H1.search(page.signals or "")
        out = out.model_copy(update={
            "is_job": True, "confidence": 0.5,
            "job_title": out.job_title or (clean_text(h1.group(1), 120) if h1 else ""),
            "reason": "Page has an apply button and job description sections",
        })
    return out
