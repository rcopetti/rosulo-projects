import enum
from dataclasses import dataclass, field
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.services.ai.agents.base import BaseAgent
from app.services.ai.llm_client import LLMClient

logger = get_logger(__name__)


class AgentType(str, enum.Enum):
    GENERAL = "general"
    REPORT = "report"
    SCHEDULE = "schedule"
    RISK = "risk"
    TASK = "task"


@dataclass
class AgentDecision:
    agent_type: AgentType
    confidence: float
    reasoning: str
    parameters: dict[str, Any] = field(default_factory=dict)


class Orchestrator:
    def __init__(self, db: AsyncSession, llm: LLMClient) -> None:
        self.db = db
        self.llm = llm
        self._agents: dict[AgentType, BaseAgent] = {}

    def register_agent(self, agent_type: AgentType, agent: BaseAgent) -> None:
        self._agents[agent_type] = agent

    async def decide(self, project_id: UUID, query: str) -> AgentDecision:
        classification_prompt = [
            {
                "role": "system",
                "content": (
                    "You are a classifier for project management queries. "
                    "Analyze the user query and return JSON with fields: "
                    "agent_type (one of: general, report, schedule, risk, task), "
                    "confidence (0-1), reasoning (brief explanation), parameters (object). "
                    "Respond with ONLY the JSON object."
                ),
            },
            {"role": "user", "content": query},
        ]

        response = await self.llm.complete(
            messages=classification_prompt,
            model=self.llm.haiku_model_id,
            max_tokens=500,
            temperature=0.1,
        )

        import json

        try:
            data = json.loads(response)
            return AgentDecision(
                agent_type=AgentType(data.get("agent_type", "general")),
                confidence=data.get("confidence", 0.5),
                reasoning=data.get("reasoning", ""),
                parameters=data.get("parameters", {}),
            )
        except (json.JSONDecodeError, ValueError):
            logger.warning("agent_classification_failed", response=response)
            return AgentDecision(
                agent_type=AgentType.GENERAL,
                confidence=0.5,
                reasoning="Default fallback",
            )

    async def execute(
        self, project_id: UUID, query: str, decision: AgentDecision | None = None
    ) -> str:
        if decision is None:
            decision = await self.decide(project_id, query)

        logger.info(
            "orchestrator_execute",
            agent_type=decision.agent_type.value,
            confidence=decision.confidence,
        )

        agent = self._agents.get(decision.agent_type)
        if not agent:
            agent = self._agents.get(AgentType.GENERAL)
        if not agent:
            return "No agent available to handle this query."

        return await agent.run(project_id, query, decision.parameters)
