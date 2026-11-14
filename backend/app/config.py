from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    ENVIRONMENT: str = "local"
    DATABASE_URL: str = "postgresql+psycopg2://applier:applier@localhost:5432/applier"
    CORS_ORIGINS: str = "chrome-extension://*"

    JWT_SECRET: str = "change-me"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 720

    GOOGLE_CLIENT_ID: str = ""

    # AI: everything is a LiteLLM model string, so swapping provider = env change.
    LLM_MODEL: str = "anthropic/claude-sonnet-5-5"
    LLM_API_KEY: str = ""
    LLM_API_BASE: str = ""
    LLM_TEMPERATURE: float = 0.3
    LLM_MAX_TOKENS: int = 4000
    # Extra provider params as JSON, e.g. {"thinking": {"type": "disabled"}} for GLM.
    LLM_EXTRA_BODY: str = ""
    DETECT_LLM_MODEL: str = ""
    DETECT_LLM_API_KEY: str = ""
    DETECT_LLM_API_BASE: str = ""
    DETECT_LLM_EXTRA_BODY: str = ""
    # Job-page detection is a small classification call: low output budget, trimmed input.
    DETECT_LLM_MAX_TOKENS: int = 600
    DETECT_LLM_TEMPERATURE: float = 0.0
    DETECT_TEXT_CHARS: int = 3000  # page text sent to the detector (head + tail of the cleaned text)

    # Email (Resend). Without RESEND_API_KEY emails are logged and skipped.
    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = "Applier <noreply@example.com>"  # must be on a domain verified in Resend
    EMAIL_REPLY_TO: str = ""

    # Product update emails (campaign broadcasts, drip-sent in daily batches)
    UPDATE_EMAIL_SEND_HOUR: int = 9           # UTC hour a campaign's daily batch runs (campaign can override)
    UPDATE_EMAIL_SCHEDULER: bool = True       # set false on extra workers / in tests
    UPDATE_EMAIL_FROM: str = ""               # defaults to EMAIL_FROM
    PUBLIC_API_URL: str = "http://localhost:8000"  # used to build unsubscribe links

    # Stripe (credit purchases). Without STRIPE_SECRET_KEY the Buy credits endpoints return 503.
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    # Credit meter: "moderate" once this share is used, "low" once this share or less is left.
    CREDITS_MODERATE_USED: float = 0.5
    CREDITS_LOW_REMAINING: float = 0.2

    FREE_APPLICATIONS: int = 10
    PRICE_PER_APPLICATION_USD: float = 0.10
    MINIMUM_CHARGE_USD: float = 3.00

    MAX_SOURCE_CHARS: int = 30000
    MAX_JOB_CHARS: int = 12000


settings = Settings()
