from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project
from app.models.schedule import Milestone
from app.models.wbs import Task
from app.services.ai.agents.base import BaseAgent
from app.services.ai.llm_client import LLMClient


class ReportAgent(BaseAgent):
    def __init__(self, db: AsyncSession, llm: LLMClient) -> None:
        super().__init__(db, llm)

    async def run(self, project_id: UUID, query: str, context: dict[str, Any] | None = None) -> str:
        report_context = await self.retrieve_context(project_id, query)
        system_prompt = self.build_system_prompt(report_context)

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": query},
        ]

        return await self.llm.complete(messages)

    async def retrieve_context(self, project_id: UUID, query: str) -> dict[str, Any]:
        project_result = await self.db.execute(
            select(Project).where(Project.id == project_id)
        )
        project = project_result.scalar_one_or_none()

        tasks_result = await self.db.execute(
            select(
                Task.status,
                func.count(Task.id).label("count"),
            )
            .where(Task.project_id == project_id, Task.deleted_at.is_(None))
            .group_by(Task.status)
        )
        task_stats = {row.status.value: row.count for row in tasks_result}

        total_result = await self.db.execute(
            select(func.count(Task.id)).where(
                Task.project_id == project_id, Task.deleted_at.is_(None)
            )
        )
        total_tasks = total_result.scalar() or 0

        completed_result = await self.db.execute(
            select(func.count(Task.id)).where(
                Task.project_id == project_id,
                Task.deleted_at.is_(None),
                Task.status == "done",
            )
        )
        completed_tasks = completed_result.scalar() or 0

        milestones_result = await self.db.execute(
            select(Milestone)
            .where(Milestone.project_id == project_id)
            .order_by(Milestone.target_date.asc())
            .limit(5)
        )
        upcoming_milestones = list(milestones_result.scalars().all())

        return {
            "project_name": project.name if project else "Unknown",
            "project_status": project.status.value if project else "Unknown",
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "completion_pct": (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0,
            "task_by_status": task_stats,
            "upcoming_milestones": [
                {"name": m.name, "target_date": m.target_date.isoformat(), "status": m.status.value}
                for m in upcoming_milestones
            ],
        }

    def build_system_prompt(self, context: dict[str, Any]) -> str:
        return (
            "You are a project management reporting agent. Generate clear, actionable status reports. "
            "Use the provided project data to create comprehensive reports.\n\n"
            f"Project: {context.get('project_name')}\n"
            f"Status: {context.get('project_status')}\n"
            f"Total Tasks: {context.get('total_tasks')}\n"
            f"Completed: {context.get('completed_tasks')} ({context.get('completion_pct', 0):.1f}%)\n"
            f"Task Breakdown: {context.get('task_by_status')}\n"
            f"Upcoming Milestones: {context.get('upcoming_milestones')}\n\n"
            "Generate a professional project status report with key highlights, risks, and recommendations."
        )
