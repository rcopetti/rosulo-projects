from datetime import date
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.schedule import Milestone, MilestoneStatus
from app.schemas.schedule import MilestoneCreate, MilestoneUpdate


class ScheduleService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_milestone(self, project_id: UUID, data: MilestoneCreate) -> Milestone:
        milestone = Milestone(
            project_id=project_id,
            name=data.name,
            description=data.description,
            target_date=date.fromisoformat(data.target_date),
            status=MilestoneStatus(data.status),
        )
        self.db.add(milestone)
        await self.db.flush()
        return milestone

    async def list_milestones(
        self, project_id: UUID, status: str | None = None
    ) -> list[Milestone]:
        query = select(Milestone).where(Milestone.project_id == project_id)
        if status:
            query = query.where(Milestone.status == status)
        query = query.order_by(Milestone.target_date.asc())
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def update_milestone(self, milestone_id: UUID, data: MilestoneUpdate) -> Milestone:
        result = await self.db.execute(select(Milestone).where(Milestone.id == milestone_id))
        milestone = result.scalar_one_or_none()
        if not milestone:
            raise NotFoundError("Milestone not found")
        update_data = data.model_dump(exclude_unset=True)
        if "target_date" in update_data and update_data["target_date"]:
            update_data["target_date"] = date.fromisoformat(update_data["target_date"])
        if "completed_date" in update_data and update_data["completed_date"]:
            update_data["completed_date"] = date.fromisoformat(update_data["completed_date"])
        if "status" in update_data and update_data["status"]:
            update_data["status"] = MilestoneStatus(update_data["status"])
        for field, value in update_data.items():
            setattr(milestone, field, value)
        await self.db.flush()
        return milestone

    async def get_gantt_data(self, project_id: UUID) -> dict:
        from app.models.wbs import Task

        tasks_result = await self.db.execute(
            select(Task)
            .where(Task.project_id == project_id, Task.deleted_at.is_(None))
            .order_by(Task.start_date.asc().nulls_last())
        )
        tasks = list(tasks_result.scalars().all())

        milestones_result = await self.db.execute(
            select(Milestone)
            .where(Milestone.project_id == project_id)
            .order_by(Milestone.target_date.asc())
        )
        milestones = list(milestones_result.scalars().all())

        return {
            "tasks": [
                {
                    "id": str(t.id),
                    "title": t.title,
                    "start_date": t.start_date.isoformat() if t.start_date else None,
                    "due_date": t.due_date.isoformat() if t.due_date else None,
                    "status": t.status,
                    "completion_pct": t.completion_pct,
                    "assigned_to": str(t.assigned_to) if t.assigned_to else None,
                }
                for t in tasks
            ],
            "milestones": [
                {
                    "id": str(m.id),
                    "name": m.name,
                    "target_date": m.target_date.isoformat(),
                    "status": m.status,
                }
                for m in milestones
            ],
        }
