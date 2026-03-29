import enum
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class Methodology(str, enum.Enum):
    WATERFALL = "waterfall"
    AGILE = "agile"
    HYBRID = "hybrid"
    PRINCE2 = "prince2"
    CUSTOM = "custom"


class ProjectStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class ProjectPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ProjectRole(str, enum.Enum):
    OWNER = "owner"
    MANAGER = "manager"
    MEMBER = "member"
    VIEWER = "viewer"


class Project(Base, TimestampMixin):
    __tablename__ = "projects"

    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    methodology: Mapped[Methodology] = mapped_column(
        Enum(Methodology), nullable=False, default=Methodology.AGILE
    )
    status: Mapped[ProjectStatus] = mapped_column(
        Enum(ProjectStatus), nullable=False, default=ProjectStatus.DRAFT
    )
    priority: Mapped[ProjectPriority] = mapped_column(
        Enum(ProjectPriority), nullable=False, default=ProjectPriority.MEDIUM
    )
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    budget: Mapped[float | None] = mapped_column(Float, nullable=True)
    budget_currency: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")
    complexity_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    risk_level: Mapped[str | None] = mapped_column(String(50), nullable=True)
    ai_enabled: Mapped[bool] = mapped_column(default=False, nullable=False)
    ai_model_preference: Mapped[str | None] = mapped_column(String(100), nullable=True)
    ai_budget_limit: Mapped[float | None] = mapped_column(Float, nullable=True)
    charter: Mapped[dict | None] = mapped_column(JSONB, nullable=True, default=dict)

    members: Mapped[list["ProjectMembership"]] = relationship(back_populates="project", lazy="selectin")
    tasks: Mapped[list["Task"]] = relationship(back_populates="project", lazy="select")
    wbs_items: Mapped[list["WBSItem"]] = relationship(back_populates="project", lazy="select")


class ProjectMembership(Base, TimestampMixin):
    __tablename__ = "project_memberships"

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    role: Mapped[ProjectRole] = mapped_column(Enum(ProjectRole), nullable=False, default=ProjectRole.MEMBER)
    hourly_rate: Mapped[float | None] = mapped_column(Float, nullable=True)

    project: Mapped["Project"] = relationship(back_populates="members")
    user: Mapped["User"] = relationship(back_populates="project_memberships")
