import dspy

from app.config import settings
from app.dspy_modules.lm import get_detect_lm, get_lm
from app.dspy_modules.signatures import DetectJobPage, ReviseResume, TailorResume
from app.schemas import DetectOut, TailoredResume


def detect_job_page(url: str, title: str, text: str, signals: str = "") -> DetectOut:
    with dspy.context(lm=get_detect_lm()):
        out = dspy.Predict(DetectJobPage)(
            page_url=url, page_title=title, page_text=text[: settings.DETECT_TEXT_CHARS + 50], page_signals=signals[:600]
        )
    return DetectOut(
        is_job=bool(out.is_job_posting),
        confidence=max(0.0, min(1.0, float(out.confidence))),
        job_title=(out.job_title or "").strip(),
        company=(out.company or "").strip(),
        reason=(out.reason or "").strip(),
        method="llm",
    )


def tailor_resume(source: str, job_title: str, company: str, jd: str) -> TailoredResume:
    with dspy.context(lm=get_lm()):
        out = dspy.ChainOfThought(TailorResume)(
            source_resume=source[: settings.MAX_SOURCE_CHARS],
            job_title=job_title,
            company=company,
            job_description=jd[: settings.MAX_JOB_CHARS],
        )
    return out.resume


def revise_resume(source: str, current: TailoredResume, jd: str, instruction: str) -> TailoredResume:
    with dspy.context(lm=get_lm()):
        out = dspy.Predict(ReviseResume)(
            source_resume=source[: settings.MAX_SOURCE_CHARS],
            current_resume=current,
            job_description=jd[: settings.MAX_JOB_CHARS],
            instruction=instruction,
        )
    return out.resume
