from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_session
from app.models.user import User
from app.schemas.schedule import MilestoneCreate, MilestoneResponse, MilestoneUpdate
from app.services.schedule_service import ScheduleService

router = APIRouter()


@router.post("/projects/{project_id}/milestones", response_model=MilestoneResponse, status_code=201)
async def create_milestone(
    project_id: UUID,
    data: MilestoneCreate,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> MilestoneResponse:
    service = ScheduleService(db)
    milestone = await service.create_milestone(project_id, data)
    return _milestone_to_response(milestone)


@router.get("/projects/{project_id}/milestones", response_model=list[MilestoneResponse])
async def list_milestones(
    project_id: UUID,
    status: str | None = Query(None),
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> list[MilestoneResponse]:
    service = ScheduleService(db)
    milestones = await service.list_milestones(project_id, status)
    return [_milestone_to_response(m) for m in milestones]


@router.patch("/milestones/{milestone_id}", response_model=MilestoneResponse)
async def update_milestone(
    milestone_id: UUID,
    data: MilestoneUpdate,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> MilestoneResponse:
    service = ScheduleService(db)
    milestone = await service.update_milestone(milestone_id, data)
    return _milestone_to_response(milestone)


@router.get("/projects/{project_id}/gantt")
async def get_gantt_data(
    project_id: UUID,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> dict:
    service = ScheduleService(db)
    return await service.get_gantt_data(project_id)


def _milestone_to_response(milestone: any) -> MilestoneResponse:
    return MilestoneResponse(
        id=str(milestone.id),
        project_id=str(milestone.project_id),
        name=milestone.name,
        description=milestone.description,
        target_date=milestone.target_date.isoformat(),
        completed_date=milestone.completed_date.isoformat() if milestone.completed_date else None,
        status=milestone.status.value,
        created_at=milestone.created_at.isoformat(),
        updated_at=milestone.updated_at.isoformat(),
    )
