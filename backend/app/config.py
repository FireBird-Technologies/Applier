from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent

_DEFAULT_JWT_SECRET = "change-me"


class Settings(BaseSettings):
    """Three groups. Only the first two are meant to be set in .env; the third are fixed defaults.

    Any field can still be overridden by an environment variable of the same name, but the production template
    (deploy/backend.env.production.example) lists only the first two groups.
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # ================================================================ 1. REQUIRED: secrets and deployment-specific values
    DATABASE_URL: str = "postgresql+psycopg2://applier:applier@localhost:5432/applier"
    JWT_SECRET: str = _DEFAULT_JWT_SECRET  # the app refuses to start on Postgres with this default
    GOOGLE_CLIENT_ID: str = ""
    LLM_API_KEY: str = ""
    RESEND_API_KEY: str = ""  # without it emails are logged and skipped
    STRIPE_SECRET_KEY: str = ""  # without it the Buy credits endpoints return 503
    STRIPE_WEBHOOK_SECRET: str = ""
    PUBLIC_API_URL: str = "http://localhost:8000"  # the API's own public address: unsubscribe links, Stripe fallback
    # The marketing website. When set, Stripe sends customers back to <SITE_URL>/billing/success (that page asks the API to
    # confirm the payment). When empty, the API serves a plain return page itself.
    SITE_URL: str = ""

    # ================================================================ 2. ADJUSTABLE: change in .env, restart, no code change
    # Pricing
    FREE_APPLICATIONS: int = 10
    PRICE_PER_APPLICATION_USD: float = 0.10
    MINIMUM_CHARGE_USD: float = 3.00
    # AI: everything is a LiteLLM model string, so swapping provider is an env change.
    LLM_MODEL: str = "anthropic/claude-sonnet-5-5"
    LLM_API_BASE: str = ""
    LLM_EXTRA_BODY: str = ""  # extra provider params as JSON, e.g. {"thinking": {"type": "disabled"}} for GLM
    DETECT_LLM_MODEL: str = ""  # a smaller model for job-page detection; empty = use LLM_MODEL
    DETECT_LLM_API_KEY: str = ""  # empty = use LLM_API_KEY
    DETECT_LLM_API_BASE: str = ""
    DETECT_LLM_EXTRA_BODY: str = ""
    # Email (must be on a domain verified in Resend)
    EMAIL_FROM: str = "Applier <noreply@firebird-technologies.com>"
    EMAIL_REPLY_TO: str = ""
    UPDATE_EMAIL_FROM: str = ""  # product update emails; empty = use EMAIL_FROM

    # ================================================================ 3. FIXED: hardcoded defaults
    # Database
    AUTO_MIGRATE: bool | None = None  # unset: migrate on start for SQLite, not for Postgres (deploy runs alembic itself)
    # Login tokens
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 720
    # Anti-abuse: each browser install sends a random ID; one browser can belong to only one account.
    REQUIRE_DEVICE_ID: bool = True
    # AI generation budgets
    LLM_TEMPERATURE: float = 0.3
    LLM_MAX_TOKENS: int = 4000
    DETECT_LLM_MAX_TOKENS: int = 600  # job-page detection is a small classification call: low output budget...
    DETECT_LLM_TEMPERATURE: float = 0.0
    DETECT_TEXT_CHARS: int = 3000  # ...and trimmed input (head + tail of the cleaned page text)
    MAX_SOURCE_CHARS: int = 30000
    MAX_JOB_CHARS: int = 12000
    # Product update emails (campaign broadcasts, drip-sent in daily batches)
    UPDATE_EMAIL_SEND_HOUR: int = 9  # UTC hour a campaign's daily batch runs (a campaign can override)
    UPDATE_EMAIL_SCHEDULER: bool = True
    # Credits and checkout
    STRIPE_ALLOW_PROMO_CODES: bool = True  # the "Add promotion code" box on Stripe Checkout
    CREDITS_MODERATE_USED: float = 0.5  # "moderate" once this share is used...
    CREDITS_LOW_REMAINING: float = 0.2  # ..."low" once this share or less is left
    MAX_CREDITS_PER_PURCHASE: int = 2000
    SUGGESTED_CREDITS: str = "50,100,250,500"  # comma-separated pack sizes; the minimum purchase is always offered too

    @field_validator("DATABASE_URL")
    @classmethod
    def _portable_url(cls, v: str) -> str:
        """Accept the URL forms hosts hand out, and don't let SQLite depend on the working directory."""
        for prefix in ("postgres://", "postgresql://"):  # SQLAlchemy needs an explicit driver
            if v.startswith(prefix):
                v = "postgresql+psycopg2://" + v[len(prefix):]
        if v.startswith("sqlite:///") and not v.startswith("sqlite:////") and ":memory:" not in v:
            rel = v[len("sqlite:///"):]
            if rel and not Path(rel).is_absolute():  # sqlite:///./dev.db -> <backend>/dev.db wherever you start from
                v = "sqlite:///" + (BACKEND_DIR / rel).as_posix()
        return v

    @property
    def is_sqlite(self) -> bool:
        return self.DATABASE_URL.startswith("sqlite")

    @property
    def auto_migrate(self) -> bool:
        return self.is_sqlite if self.AUTO_MIGRATE is None else self.AUTO_MIGRATE

    def startup_problems(self) -> tuple[list[str], list[str]]:
        """(fatal, warnings) about required settings. Fatal ones stop the app from starting."""
        fatal: list[str] = []
        warnings: list[str] = []
        if not self.is_sqlite and self.JWT_SECRET == _DEFAULT_JWT_SECRET:
            fatal.append("JWT_SECRET is not set. Anyone could forge login tokens. Set it in .env (openssl rand -hex 32).")
        notes = {
            "GOOGLE_CLIENT_ID": "Google sign-in will not work.",
            "LLM_API_KEY": "AI requests will fail.",
            "RESEND_API_KEY": "Emails will be skipped.",
            "STRIPE_SECRET_KEY": "Buying credits is switched off.",
            "STRIPE_WEBHOOK_SECRET": "Stripe webhooks will be rejected, so paid credits will rely on the return page alone.",
        }
        warnings += [f"{name} is not set. {why}" for name, why in notes.items() if not getattr(self, name)]
        if not self.is_sqlite and "localhost" in self.PUBLIC_API_URL:
            warnings.append("PUBLIC_API_URL still points at localhost, so unsubscribe links will not work for users.")
        return fatal, warnings


settings = Settings()
