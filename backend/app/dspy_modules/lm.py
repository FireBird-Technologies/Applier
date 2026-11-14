"""LM factory. Provider/model/key/base all come from env (see config.Settings)."""
import json

import dspy

from app.config import settings


def _build(
    model: str, key: str, base: str, extra_body: str = "", *, temperature: float | None = None, max_tokens: int | None = None
) -> dspy.LM:
    kwargs: dict = {
        "temperature": settings.LLM_TEMPERATURE if temperature is None else temperature,
        "max_tokens": max_tokens or settings.LLM_MAX_TOKENS,
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


def _different_model() -> bool:
    return bool(settings.DETECT_LLM_MODEL) and settings.DETECT_LLM_MODEL != settings.LLM_MODEL


def get_detect_lm() -> dspy.LM:
    """Small/cheap model for page classification.

    DETECT_LLM_MODEL picks a smaller model; if unset it reuses the main model. Either way the call
    gets the reduced DETECT_LLM_MAX_TOKENS budget. Key and base fall back to the main LLM's.
    """
    if "detect" not in _cache:
        _cache["detect"] = _build(
            settings.DETECT_LLM_MODEL or settings.LLM_MODEL,
            settings.DETECT_LLM_API_KEY or settings.LLM_API_KEY,
            settings.DETECT_LLM_API_BASE or settings.LLM_API_BASE,
            # A different detector model may be on another provider, so it only inherits the main
            # model's provider params (e.g. GLM thinking off) when it is the same model.
            settings.DETECT_LLM_EXTRA_BODY or ("" if _different_model() else settings.LLM_EXTRA_BODY),
            temperature=settings.DETECT_LLM_TEMPERATURE,
            max_tokens=settings.DETECT_LLM_MAX_TOKENS,
        )
    return _cache["detect"]
