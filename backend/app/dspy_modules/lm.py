"""LM factory. Provider/model/key/base all come from env (see config.Settings)."""
import json

import dspy

from app.config import settings


def _build(model: str, key: str, base: str, extra_body: str = "") -> dspy.LM:
    kwargs: dict = {
        "temperature": settings.LLM_TEMPERATURE,
        "max_tokens": settings.LLM_MAX_TOKENS,
    }
    if key:
        kwargs["api_key"] = key
    if base:
        kwargs["api_base"] = base
    if extra_body.strip():
        kwargs["extra_body"] = json.loads(extra_body)
    return dspy.LM(model, **kwargs)


_cache: dict[str, dspy.LM] = {}


def get_lm() -> dspy.LM:
    if "main" not in _cache:
        _cache["main"] = _build(settings.LLM_MODEL, settings.LLM_API_KEY, settings.LLM_API_BASE, settings.LLM_EXTRA_BODY)
    return _cache["main"]


def get_detect_lm() -> dspy.LM:
    """Cheaper/faster model for page classification; falls back to the main one."""
    if not settings.DETECT_LLM_MODEL:
        return get_lm()
    if "detect" not in _cache:
        _cache["detect"] = _build(
            settings.DETECT_LLM_MODEL,
            settings.DETECT_LLM_API_KEY or settings.LLM_API_KEY,
            settings.DETECT_LLM_API_BASE or settings.LLM_API_BASE,
            settings.DETECT_LLM_EXTRA_BODY,
        )
    return _cache["detect"]
