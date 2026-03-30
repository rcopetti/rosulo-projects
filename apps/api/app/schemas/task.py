from datetime import date

from pydantic import BaseModel, Field


class SortParams(BaseModel):
    sort_by: str = "created_at"
    sort_order: str = "desc"


class TaskFilters(BaseModel):
    status: str | None = None
    priority: str | None = None
    assigned_to: str | None = None
    wbs_item_id: str | None = None
    parent_task_id: str | None = None


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    description: str | None = None
    status: str = "todo"
    priority: str = "medium"
    wbs_item_id: str | None = None
    parent_task_id: str | None = None
    assigned_to: str | None = None
    estimated_hours: float | None = None
    start_date: date | None = None
    due_date: date | None = None
    tags: list[str] = Field(default_factory=list)


class TaskUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=500)
    description: str | None = None
    status: str | None = None
    priority: str | None = None
    wbs_item_id: str | None = None
    parent_task_id: str | None = None
    assigned_to: str | None = None
    estimated_hours: float | None = None
    actual_hours: float | None = None
    start_date: date | None = None
    due_date: date | None = None
    completed_date: date | None = None
    completion_pct: float | None = Field(None, ge=0, le=100)
    tags: list[str] | None = None


class TaskResponse(BaseModel):
    id: str
    project_id: str
    wbs_item_id: str | None = None
    parent_task_id: str | None = None
    assigned_to: str | None = None
    title: str
    description: str | None = None
    status: str
    priority: str
    estimated_hours: float | None = None
    actual_hours: float | None = None
    start_date: str | None = None
    due_date: str | None = None
    completed_date: str | None = None
    completion_pct: float
    tags: list[str] | None = None
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


class TaskDependencyCreate(BaseModel):
    depends_on_id: str
    dependency_type: str = "finish_to_start"


class TaskDependencyResponse(BaseModel):
    id: str
    task_id: str
    depends_on_id: str
    dependency_type: str
    created_at: str

    model_config = {"from_attributes": True}


class CursorPaginatedResponse(BaseModel):
    items: list[TaskResponse]
    next_cursor: str | None = None
    has_more: bool
    total_count: int | None = None
