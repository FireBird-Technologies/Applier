from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class UpdateEmail(Base):
    """A broadcast campaign. Sent in daily batches until every eligible user has received it."""

    __tablename__ = "update_emails"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    subject: Mapped[str] = mapped_column(String(300))
    body: Mapped[str] = mapped_column(Text)  # plain text; HTML-escaped when sent
    # all | active (>=1 resume generated) | inactive (none) | exhausted (used every credit)
    user_filter: Mapped[str] = mapped_column(String(20), default="all")
    batch_size: Mapped[int] = mapped_column(Integer, default=50)  # recipients per daily run
    send_hour: Mapped[int] = mapped_column(Integer, default=-1)  # UTC hour; -1 = UPDATE_EMAIL_SEND_HOUR
    total_users: Mapped[int] = mapped_column(Integer, default=0)
    sent_count: Mapped[int] = mapped_column(Integer, default=0)
    failed_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="scheduled", index=True)  # scheduled|running|completed
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class UpdateEmailSend(Base):
    """One row per (campaign, user). The unique constraint is what prevents double sends."""

    __tablename__ = "update_email_sends"
    __table_args__ = (UniqueConstraint("update_email_id", "user_id", name="uq_update_email_sends_email_user"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    update_email_id: Mapped[int] = mapped_column(ForeignKey("update_emails.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String(10), default="sent")  # sent | failed
    sent_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
