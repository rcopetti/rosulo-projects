from abc import ABC, abstractmethod
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.ai.llm_client import LLMClient


class BaseAgent(ABC):
    def __init__(self, db: AsyncSession, llm: LLMClient) -> None:
        self.db = db
        self.llm = llm

    @abstractmethod
    async def run(self, project_id: UUID, query: str, context: dict[str, Any] | None = None) -> str:
        pass

    @abstractmethod
    async def retrieve_context(self, project_id: UUID, query: str) -> dict[str, Any]:
        pass

    @abstractmethod
    def build_system_prompt(self, context: dict[str, Any]) -> str:
        pass
