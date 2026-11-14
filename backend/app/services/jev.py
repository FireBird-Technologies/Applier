"""Jev (TypeSafe) job-page classifier: one cheap yes/no call returning P(job posting)."""
from typesafe_sdk import Noul, TypeSafeClient

from app.config import settings

_client: TypeSafeClient | None = None

QUESTION = Noul(
    instructions=(
        "Is this page a single job posting for one specific role that a person could apply to? "
        "Answer no for job search or listing pages, company career landing pages, "
        "articles, and anything unrelated to hiring."
    )
)


def _get_client() -> TypeSafeClient:
    global _client
    if _client is None:
        _client = TypeSafeClient(
            api_key=settings.TYPESAFE_API_KEY or None,
            model=settings.JEV_MODEL or None,
            timeout=10.0,
        )
    return _client


def job_probability(url: str, title: str, text: str) -> float:
    res = _get_client().system_one(
        state={"url": url, "title": title, "text": text[: settings.MAX_JOB_CHARS // 2]},
        questions={"is_job": QUESTION},
    )
    return float(res.nouls["is_job"].noul)
