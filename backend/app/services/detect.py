"""Job-page detection: structured data -> cheap heuristic -> small, cheap LLM call on trimmed text."""
from app.config import settings
from app.dspy_modules.modules import detect_job_page
from app.schemas import DetectOut, PageIn
from app.services.textclean import clean_text, trim, trim_head_tail

MIN_TEXT = 300


def _org(v) -> str:
    return str(v.get("name", "")) if isinstance(v, dict) else str(v or "")


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
    return detect_job_page(
        trim(clean_text(page.url), 300),
        trim(clean_text(page.title), 200),
        trim_head_tail(text, settings.DETECT_TEXT_CHARS),
        trim(clean_text(page.signals), 600),
    )
