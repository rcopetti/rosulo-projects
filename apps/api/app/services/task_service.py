import uuid
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.schedule import TaskDependency
from app.models.wbs import Task
from app.schemas.task import TaskCreate, TaskDependencyCreate, TaskFilters, TaskUpdate


class TaskService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, project_id: UUID, data: TaskCreate) -> Task:
        cursor_token = uuid.uuid4().hex[:16]
        task = Task(
            project_id=project_id,
            title=data.title,
            description=data.description,
            status=data.status,
            priority=data.priority,
            wbs_item_id=UUID(data.wbs_item_id) if data.wbs_item_id else None,
            parent_task_id=UUID(data.parent_task_id) if data.parent_task_id else None,
            assigned_to=UUID(data.assigned_to) if data.assigned_to else None,
            estimated_hours=data.estimated_hours,
            start_date=data.start_date,
            due_date=data.due_date,
            tags=data.tags,
            cursor_token=cursor_token,
        )
        self.db.add(task)
        await self.db.flush()
        return task

    async def get(self, task_id: UUID) -> Task:
        result = await self.db.execute(select(Task).where(Task.id == task_id))
        task = result.scalar_one_or_none()
        if not task:
            raise NotFoundError("Task not found")
        return task

    async def list(
        self,
        project_id: UUID,
        filters: TaskFilters | None = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        cursor: str | None = None,
        limit: int = 20,
    ) -> tuple[list[Task], str | None, bool]:
        query = select(Task).where(Task.project_id == project_id, Task.deleted_at.is_(None))

        if filters:
            if filters.status:
                query = query.where(Task.status == filters.status)
            if filters.priority:
                query = query.where(Task.priority == filters.priority)
            if filters.assigned_to:
                query = query.where(Task.assigned_to == UUID(filters.assigned_to))
            if filters.wbs_item_id:
                query = query.where(Task.wbs_item_id == UUID(filters.wbs_item_id))
            if filters.parent_task_id:
                if filters.parent_task_id == "null":
                    query = query.where(Task.parent_task_id.is_(None))
                else:
                    query = query.where(Task.parent_task_id == UUID(filters.parent_task_id))

        if cursor:
            cursor_task = await self.db.execute(
                select(Task).where(Task.cursor_token == cursor)
            )
            cursor_obj = cursor_task.scalar_one_or_none()
            if cursor_obj:
                sort_column = getattr(Task, sort_by, Task.created_at)
                if sort_order == "desc":
                    query = query.where(sort_column < getattr(cursor_obj, sort_by))
                else:
                    query = query.where(sort_column > getattr(cursor_obj, sort_by))

        sort_column = getattr(Task, sort_by, Task.created_at)
        if sort_order == "desc":
            query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(sort_column.asc())

        query = query.limit(limit + 1)
        result = await self.db.execute(query)
        tasks = list(result.scalars().all())

        has_more = len(tasks) > limit
        if has_more:
            tasks = tasks[:limit]

        next_cursor = tasks[-1].cursor_token if has_more and tasks else None
        return tasks, next_cursor, has_more

    async def update(self, task_id: UUID, data: TaskUpdate) -> Task:
        task = await self.get(task_id)
        update_data = data.model_dump(exclude_unset=True)

        if "status" in update_data and update_data["status"] == "done":
            update_data["completed_date"] = datetime.now(timezone.utc).date()
            update_data["completion_pct"] = 100.0

        for field, value in update_data.items():
            if field in ("wbs_item_id", "parent_task_id", "assigned_to") and value:
                setattr(task, field, UUID(value))
            else:
                setattr(task, field, value)
        await self.db.flush()
        return task

    async def delete(self, task_id: UUID) -> None:
        from datetime import datetime, timezone

        task = await self.get(task_id)
        task.deleted_at = datetime.now(timezone.utc)
        await self.db.flush()

    async def add_dependency(self, task_id: UUID, data: TaskDependencyCreate) -> TaskDependency:
        task = await self.get(task_id)
        await self.get(UUID(data.depends_on_id))

        existing = await self.db.execute(
            select(TaskDependency).where(
                TaskDependency.task_id == task_id,
                TaskDependency.depends_on_id == UUID(data.depends_on_id),
            )
        )
        if existing.scalar_one_or_none():
            from app.core.exceptions import DuplicateError

            raise DuplicateError("Dependency already exists")

        dependency = TaskDependency(
            task_id=task_id,
            depends_on_id=UUID(data.depends_on_id),
            dependency_type=data.dependency_type,
        )
        self.db.add(dependency)
        await self.db.flush()
        return dependency

    async def list_dependencies(self, task_id: UUID) -> list[TaskDependency]:
        result = await self.db.execute(
            select(TaskDependency).where(TaskDependency.task_id == task_id)
        )
        return list(result.scalars().all())
