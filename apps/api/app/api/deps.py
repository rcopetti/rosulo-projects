from collections.abc import AsyncGenerator
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, settings
from app.core.exceptions import ForbiddenError
from app.core.security import verify_token
from app.db.session import get_db
from app.models.organization import OrgRole
from app.models.user import User
from app.services.auth_service import AuthService
from app.services.org_service import OrgService

security = HTTPBearer()


async def get_session(db: AsyncSession = Depends(get_db)) -> AsyncSession:
    return db


def get_settings() -> Settings:
    return settings


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = verify_token(credentials.credentials, token_type="access")
    user_id = UUID(payload["sub"])
    auth_service = AuthService(db)
    return await auth_service.get_user_by_id(user_id)


def require_org_role(allowed_roles: list[OrgRole]):
    async def dependency(
        org_id: UUID,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> OrgRole:
        org_service = OrgService(db)
        return await org_service.check_role(org_id, current_user.id, allowed_roles)

    return dependency


def require_project_role(allowed_roles: list[str]):
    async def dependency(
        project_id: UUID,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> None:
        from sqlalchemy import select

        from app.models.project import Project, ProjectMembership, ProjectRole

        result = await db.execute(
            select(Project).where(Project.id == project_id)
        )
        project = result.scalar_one_or_none()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        member_result = await db.execute(
            select(ProjectMembership).where(
                ProjectMembership.project_id == project_id,
                ProjectMembership.user_id == current_user.id,
            )
        )
        membership = member_result.scalar_one_or_none()
        if not membership:
            raise HTTPException(status_code=403, detail="Not a project member")
        if membership.role.value not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")

    return dependency
