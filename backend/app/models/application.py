import enum
from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ApplicationStatus(str, enum.Enum):
    DRAFT = "draft"      # tailored resume generated, not downloaded
    APPLIED = "applied"  # downloaded -> counts against the quota


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    source_resume_id: Mapped[int | None] = mapped_column(
        ForeignKey("source_resumes.id", ondelete="SET NULL"), nullable=True
    )
    job_url: Mapped[str] = mapped_column(String(2048), default="")
    job_title: Mapped[str] = mapped_column(String(512), default="")
    company: Mapped[str] = mapped_column(String(512), default="")
    job_description: Mapped[str] = mapped_column(Text)
    resume: Mapped[dict] = mapped_column(JSON)  # structured TailoredResume
    version: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(16), default=ApplicationStatus.DRAFT.value, index=True)
    applied_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="applications")
