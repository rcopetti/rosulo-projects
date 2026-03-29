from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import DuplicateError, NotFoundError
from app.models.project import Project, ProjectMembership, ProjectRole
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectMemberCreate, ProjectUpdate


class ProjectService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, org_id: UUID, data: ProjectCreate, owner_id: UUID) -> Project:
        project = Project(
            org_id=org_id,
            name=data.name,
            description=data.description,
            methodology=data.methodology,
            priority=data.priority,
            budget=data.budget,
            budget_currency=data.budget_currency,
            ai_enabled=data.ai_enabled,
            charter=data.charter,
        )
        self.db.add(project)
        await self.db.flush()
        membership = ProjectMembership(
            project_id=project.id, user_id=owner_id, role=ProjectRole.OWNER
        )
        self.db.add(membership)
        await self.db.flush()
        return project

    async def get(self, project_id: UUID) -> Project:
        result = await self.db.execute(select(Project).where(Project.id == project_id))
        project = result.scalar_one_or_none()
        if not project:
            raise NotFoundError("Project not found")
        return project

    async def list(
        self, org_id: UUID, status: str | None = None, methodology: str | None = None
    ) -> list[Project]:
        query = select(Project).where(Project.org_id == org_id, Project.deleted_at.is_(None))
        if status:
            query = query.where(Project.status == status)
        if methodology:
            query = query.where(Project.methodology == methodology)
        query = query.order_by(Project.created_at.desc())
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def update(self, project_id: UUID, data: ProjectUpdate) -> Project:
        project = await self.get(project_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(project, field, value)
        await self.db.flush()
        return project

    async def delete(self, project_id: UUID) -> None:
        from datetime import datetime, timezone

        project = await self.get(project_id)
        project.deleted_at = datetime.now(timezone.utc)
        await self.db.flush()

    async def add_member(self, project_id: UUID, data: ProjectMemberCreate) -> ProjectMembership:
        existing = await self.db.execute(
            select(ProjectMembership).where(
                ProjectMembership.project_id == project_id,
                ProjectMembership.user_id == UUID(data.user_id),
            )
        )
        if existing.scalar_one_or_none():
            raise DuplicateError("User is already a project member")
        membership = ProjectMembership(
            project_id=project_id,
            user_id=UUID(data.user_id),
            role=ProjectRole(data.role),
            hourly_rate=data.hourly_rate,
        )
        self.db.add(membership)
        await self.db.flush()
        return membership

    async def list_members(self, project_id: UUID) -> list[ProjectMembership]:
        result = await self.db.execute(
            select(ProjectMembership)
            .where(ProjectMembership.project_id == project_id)
            .join(User, ProjectMembership.user_id == User.id)
            .order_by(User.name)
        )
        return list(result.scalars().all())
