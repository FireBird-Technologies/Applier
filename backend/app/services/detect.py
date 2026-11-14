"""Job-page detection: structured data -> cheap heuristic -> Jev (or DSPy LLM) classifier."""
import logging

from app.config import settings
from app.dspy_modules.modules import detect_job_page, extract_job_meta
from app.schemas import DetectOut, PageIn
from app.services import jev

log = logging.getLogger(__name__)
MIN_TEXT = 300


def _org(v) -> str:
    return str(v.get("name", "")) if isinstance(v, dict) else str(v or "")


def _use_jev() -> bool:
    mode = settings.DETECTOR.lower()
    return mode == "jev" or (mode == "auto" and bool(settings.TYPESAFE_API_KEY))


def _detect_with_jev(page: PageIn) -> DetectOut:
    p = jev.job_probability(page.url, page.title, page.text)
    if p < settings.JEV_THRESHOLD:
        return DetectOut(is_job=False, confidence=1 - p, reason="Doesn't look like a single job posting", method="jev")
    title, company = extract_job_meta(page.url, page.title, page.text)  # Jev only answers yes/no
    return DetectOut(is_job=True, confidence=p, job_title=title, company=company, method="jev")


def detect(page: PageIn) -> DetectOut:
    s = page.structured
    if s and s.get("title"):  # schema.org JobPosting JSON-LD found by the extension
        return DetectOut(
            is_job=True, confidence=0.98, job_title=str(s.get("title", "")),
            company=_org(s.get("hiringOrganization")),
            reason="Page has JobPosting structured data", method="structured",
        )
    if len(page.text.strip()) < MIN_TEXT:
        return DetectOut(is_job=False, confidence=0.9, reason="Page has too little text", method="heuristic")
    if _use_jev():
        try:
            return _detect_with_jev(page)
        except Exception:
            log.exception("Jev detection failed; falling back to LLM")
    return detect_job_page(page.url, page.title, page.text)
