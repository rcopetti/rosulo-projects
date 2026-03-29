from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_session
from app.models.user import User
from app.schemas.project import (
    ProjectCreate,
    ProjectMemberCreate,
    ProjectMemberResponse,
    ProjectResponse,
    ProjectUpdate,
)
from app.services.project_service import ProjectService

router = APIRouter()


@router.post("/orgs/{org_id}/projects", response_model=ProjectResponse, status_code=201)
async def create_project(
    org_id: UUID,
    data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> ProjectResponse:
    service = ProjectService(db)
    project = await service.create(org_id, data, current_user.id)
    return _project_to_response(project)


@router.get("/orgs/{org_id}/projects", response_model=list[ProjectResponse])
async def list_projects(
    org_id: UUID,
    status: str | None = Query(None),
    methodology: str | None = Query(None),
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> list[ProjectResponse]:
    service = ProjectService(db)
    projects = await service.list_projects(org_id, status, methodology)
    return [_project_to_response(p) for p in projects]


@router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: UUID,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> ProjectResponse:
    service = ProjectService(db)
    project = await service.get(project_id)
    return _project_to_response(project)


@router.patch("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: UUID,
    data: ProjectUpdate,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> ProjectResponse:
    service = ProjectService(db)
    project = await service.update(project_id, data)
    return _project_to_response(project)


@router.delete("/projects/{project_id}", status_code=204)
async def delete_project(
    project_id: UUID,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> None:
    service = ProjectService(db)
    await service.delete(project_id)


@router.post("/projects/{project_id}/members", response_model=ProjectMemberResponse, status_code=201)
async def add_project_member(
    project_id: UUID,
    data: ProjectMemberCreate,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> ProjectMemberResponse:
    service = ProjectService(db)
    membership = await service.add_member(project_id, data)
    return ProjectMemberResponse(
        id=str(membership.id),
        project_id=str(membership.project_id),
        user_id=str(membership.user_id),
        role=membership.role.value if hasattr(membership.role, "value") else membership.role,
        hourly_rate=membership.hourly_rate,
        created_at=membership.created_at.isoformat(),
    )


@router.get("/projects/{project_id}/members", response_model=list[ProjectMemberResponse])
async def list_project_members(
    project_id: UUID,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> list[ProjectMemberResponse]:
    service = ProjectService(db)
    members = await service.list_members(project_id)
    return [
        ProjectMemberResponse(
            id=str(m.id),
            project_id=str(m.project_id),
            user_id=str(m.user_id),
            role=m.role.value if hasattr(m.role, "value") else m.role,
            hourly_rate=m.hourly_rate,
            user_email=m.user.email if m.user else None,
            user_name=m.user.name if m.user else None,
            created_at=m.created_at.isoformat(),
        )
        for m in members
    ]


def _project_to_response(project: any) -> ProjectResponse:
    return ProjectResponse(
        id=str(project.id),
        org_id=str(project.org_id),
        name=project.name,
        description=project.description,
        methodology=project.methodology.value if hasattr(project.methodology, "value") else project.methodology,
        status=project.status.value if hasattr(project.status, "value") else project.status,
        priority=project.priority.value if hasattr(project.priority, "value") else project.priority,
        start_date=project.start_date.isoformat() if project.start_date else None,
        end_date=project.end_date.isoformat() if project.end_date else None,
        budget=project.budget,
        budget_currency=project.budget_currency,
        complexity_score=project.complexity_score,
        risk_level=project.risk_level,
        ai_enabled=project.ai_enabled,
        ai_model_preference=project.ai_model_preference,
        ai_budget_limit=project.ai_budget_limit,
        charter=project.charter,
        created_at=project.created_at.isoformat(),
        updated_at=project.updated_at.isoformat(),
    )
