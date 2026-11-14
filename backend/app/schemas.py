from datetime import datetime

from pydantic import BaseModel, Field, field_validator


# ---- Structured resume (the single source for pdf/docx/md/txt rendering) ----
class Experience(BaseModel):
    company: str = ""
    title: str = ""
    location: str = ""
    start: str = ""
    end: str = ""
    bullets: list[str] = Field(default_factory=list)


class Education(BaseModel):
    school: str = ""
    degree: str = ""
    dates: str = ""
    details: list[str] = Field(default_factory=list)


class Project(BaseModel):
    name: str = ""
    bullets: list[str] = Field(default_factory=list)


SECTIONS = ("summary", "skills", "experience", "projects", "education", "certifications")


class TailoredResume(BaseModel):
    name: str = ""
    headline: str = ""
    contact: list[str] = Field(default_factory=list, description="email, phone, location, links")
    summary: str = ""
    skills: list[str] = Field(default_factory=list)
    experience: list[Experience] = Field(default_factory=list)
    projects: list[Project] = Field(default_factory=list)
    education: list[Education] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)
    # The user's layout: sections shown, top to bottom. A section not listed here is hidden everywhere
    # (preview, PDF, DOCX, text) but its content is kept so it can be added back.
    section_order: list[str] = Field(default_factory=lambda: list(SECTIONS))

    @field_validator("section_order")
    @classmethod
    def _known_unique(cls, v: list[str]) -> list[str]:
        out: list[str] = []
        for key in v:
            if key in SECTIONS and key not in out:
                out.append(key)
        return out


# ---- API ----
class GoogleLoginRequest(BaseModel):
    credential: str  # Google ID token


class UserOut(BaseModel):
    id: int
    email: str
    name: str
    picture: str


class UsageOut(BaseModel):
    free_limit: int
    paid_credits: int
    total: int  # free + purchased
    used: int  # credits spent: resumes generated
    remaining: int
    level: str  # ok | moderate | low | empty
    paywalled: bool
    price_per_application_usd: float
    minimum_charge_usd: float
    min_credits: int
    max_credits: int
    suggested_credits: list[int]
    promo_codes: bool = False  # Stripe Checkout shows a promotion code box


class PricingOut(BaseModel):
    free_credits: int
    price_per_application_usd: float
    minimum_charge_usd: float
    min_credits: int
    max_credits: int
    suggested_credits: list[int]
    promo_codes: bool = False


class CheckoutIn(BaseModel):
    credits: int


class CheckoutOut(BaseModel):
    url: str
    credits: int
    amount_cents: int


class AuthOut(BaseModel):
    access_token: str
    user: UserOut
    usage: UsageOut


class SourceResumeOut(BaseModel):
    id: int
    filename: str
    chars: int
    preview: str
    created_at: datetime



class SourceDocOut(BaseModel):
    """The source resume as an editable document (same shape the editor uses for tailored resumes)."""
    id: int
    filename: str
    resume: "TailoredResume"
    version: int
    can_undo: bool = False
    last_edit: str = ""
    notice: str = ""


class SourceTextIn(BaseModel):
    text: str
    filename: str = "pasted.txt"


class PageIn(BaseModel):
    url: str = ""
    title: str = ""
    text: str
    structured: dict | None = None  # JSON-LD JobPosting if the page has one
    signals: str = ""  # hints read from the page HTML: meta tags, h1, apply buttons, upload fields


class DetectIn(PageIn):
    pass


class DetectOut(BaseModel):
    is_job: bool
    confidence: float
    job_title: str = ""
    company: str = ""
    reason: str = ""
    method: str = "llm"  # structured | heuristic | llm


class GenerateIn(PageIn):
    job_title: str = ""
    company: str = ""


class ResumeIn(BaseModel):
    resume: TailoredResume


class EditIn(BaseModel):
    instruction: str = Field(min_length=3, max_length=2000)


class ApplicationOut(BaseModel):
    id: int
    job_url: str
    job_title: str
    company: str
    status: str
    version: int
    resume: TailoredResume
    created_at: datetime
    applied_at: datetime | None = None
    notice: str = ""  # e.g. what was trimmed to keep one page
    can_undo: bool = False
    last_edit: str = ""  # what Undo would revert, for the button tooltip
