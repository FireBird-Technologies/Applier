from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class SourceResume(Base):
    """The user's base resume. The newest active one is used for tailoring."""

    __tablename__ = "source_resumes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    filename: Mapped[str] = mapped_column(String(255), default="")
    text: Mapped[str] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    # Structured version, parsed from `text` the first time the user views it. Edits to it are written back
    # to `text`, which is what tailoring reads.
    resume: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1, server_default="1")

    user = relationship("User", back_populates="source_resumes")
    edits = relationship("SourceEdit", back_populates="source", order_by="SourceEdit.id", cascade="all, delete-orphan")


class SourceEdit(Base):
    """One step in the source resume's history (same idea as ApplicationEdit)."""

    __tablename__ = "source_edits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_resume_id: Mapped[int] = mapped_column(ForeignKey("source_resumes.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(12))  # generate | ai | manual
    instruction: Mapped[str] = mapped_column(Text, default="")
    resume: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    source = relationship("SourceResume", back_populates="edits")
