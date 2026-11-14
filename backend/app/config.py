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

    # Job-page detector: "jev" | "llm" | "auto" (jev when TYPESAFE_API_KEY is set, else llm).
    # If Jev errors at runtime the request falls back to the LLM.
    DETECTOR: str = "auto"
    TYPESAFE_API_KEY: str = ""
    JEV_MODEL: str = ""  # empty = SDK default; pin e.g. a versioned id for stable thresholds
    JEV_THRESHOLD: float = 0.5

    # Email (Resend). Without RESEND_API_KEY emails are logged and skipped.
    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = "Applier <noreply@example.com>"  # must be on a domain verified in Resend
    EMAIL_REPLY_TO: str = ""

    FREE_APPLICATIONS: int = 10
    PRICE_PER_APPLICATION_USD: float = 0.10
    MINIMUM_CHARGE_USD: float = 3.00

    MAX_SOURCE_CHARS: int = 30000
    MAX_JOB_CHARS: int = 12000


settings = Settings()
