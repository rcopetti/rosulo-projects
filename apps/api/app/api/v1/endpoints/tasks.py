from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_session
from app.models.user import User
from app.schemas.task import (
    CursorPaginatedResponse,
    TaskCreate,
    TaskDependencyCreate,
    TaskDependencyResponse,
    TaskFilters,
    TaskResponse,
    TaskUpdate,
)
from app.services.task_service import TaskService

router = APIRouter()


@router.post("/projects/{project_id}/tasks", response_model=TaskResponse, status_code=201)
async def create_task(
    project_id: UUID,
    data: TaskCreate,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> TaskResponse:
    service = TaskService(db)
    task = await service.create(project_id, data)
    return _task_to_response(task)


@router.get("/projects/{project_id}/tasks", response_model=CursorPaginatedResponse)
async def list_tasks(
    project_id: UUID,
    status: str | None = Query(None),
    priority: str | None = Query(None),
    assigned_to: str | None = Query(None),
    wbs_item_id: str | None = Query(None),
    parent_task_id: str | None = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    cursor: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> CursorPaginatedResponse:
    service = TaskService(db)
    filters = TaskFilters(
        status=status,
        priority=priority,
        assigned_to=assigned_to,
        wbs_item_id=wbs_item_id,
        parent_task_id=parent_task_id,
    )
    tasks, next_cursor, has_more = await service.list(
        project_id, filters, sort_by, sort_order, cursor, limit
    )
    return CursorPaginatedResponse(
        items=[_task_to_response(t) for t in tasks],
        next_cursor=next_cursor,
        has_more=has_more,
    )


@router.get("/tasks/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: UUID,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> TaskResponse:
    service = TaskService(db)
    task = await service.get(task_id)
    return _task_to_response(task)


@router.patch("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: UUID,
    data: TaskUpdate,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> TaskResponse:
    service = TaskService(db)
    task = await service.update(task_id, data)
    return _task_to_response(task)


@router.delete("/tasks/{task_id}", status_code=204)
async def delete_task(
    task_id: UUID,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> None:
    service = TaskService(db)
    await service.delete(task_id)


@router.post("/tasks/{task_id}/dependencies", response_model=TaskDependencyResponse, status_code=201)
async def add_dependency(
    task_id: UUID,
    data: TaskDependencyCreate,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> TaskDependencyResponse:
    service = TaskService(db)
    dep = await service.add_dependency(task_id, data)
    return TaskDependencyResponse(
        id=str(dep.id),
        task_id=str(dep.task_id),
        depends_on_id=str(dep.depends_on_id),
        dependency_type=dep.dependency_type,
        created_at=dep.created_at.isoformat(),
    )


@router.get("/tasks/{task_id}/dependencies", response_model=list[TaskDependencyResponse])
async def list_dependencies(
    task_id: UUID,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> list[TaskDependencyResponse]:
    service = TaskService(db)
    deps = await service.list_dependencies(task_id)
    return [
        TaskDependencyResponse(
            id=str(d.id),
            task_id=str(d.task_id),
            depends_on_id=str(d.depends_on_id),
            dependency_type=d.dependency_type,
            created_at=d.created_at.isoformat(),
        )
        for d in deps
    ]


def _task_to_response(task: any) -> TaskResponse:
    return TaskResponse(
        id=str(task.id),
        project_id=str(task.project_id),
        wbs_item_id=str(task.wbs_item_id) if task.wbs_item_id else None,
        parent_task_id=str(task.parent_task_id) if task.parent_task_id else None,
        assigned_to=str(task.assigned_to) if task.assigned_to else None,
        title=task.title,
        description=task.description,
        status=task.status.value,
        priority=task.priority.value,
        estimated_hours=task.estimated_hours,
        actual_hours=task.actual_hours,
        start_date=task.start_date.isoformat() if task.start_date else None,
        due_date=task.due_date.isoformat() if task.due_date else None,
        completed_date=task.completed_date.isoformat() if task.completed_date else None,
        completion_pct=task.completion_pct,
        tags=task.tags,
        created_at=task.created_at.isoformat(),
        updated_at=task.updated_at.isoformat(),
    )
