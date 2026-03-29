import uuid
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.copilot import AIConversation, AIMessage, ConversationStatus, MessageRole
from app.services.ai.llm_client import LLMClient


class CopilotService:
    def __init__(self, db: AsyncSession, llm_client: LLMClient | None = None) -> None:
        self.db = db
        self.llm = llm_client or LLMClient()

    async def get_or_create_conversation(
        self, project_id: UUID, user_id: UUID, conversation_id: UUID | None = None
    ) -> AIConversation:
        if conversation_id:
            result = await self.db.execute(
                select(AIConversation).where(AIConversation.id == conversation_id)
            )
            conv = result.scalar_one_or_none()
            if conv:
                return conv
        conv = AIConversation(
            project_id=project_id,
            user_id=user_id,
            title="New Conversation",
            status=ConversationStatus.ACTIVE,
        )
        self.db.add(conv)
        await self.db.flush()
        return conv

    async def process_message(
        self,
        project_id: UUID,
        user_id: UUID,
        message: str,
        conversation_id: UUID | None = None,
        context: dict | None = None,
    ) -> tuple[str, UUID, UUID]:
        conv = await self.get_or_create_conversation(project_id, user_id, conversation_id)

        user_msg = AIMessage(
            conversation_id=conv.id,
            role=MessageRole.USER,
            content=message,
            metadata_=context,
        )
        self.db.add(user_msg)
        await self.db.flush()

        history = await self._get_history(conv.id)
        system_prompt = self._build_system_prompt(project_id, context)
        messages = [{"role": "system", "content": system_prompt}] + history

        response_text = await self.llm.complete(messages)

        assistant_msg = AIMessage(
            conversation_id=conv.id,
            role=MessageRole.ASSISTANT,
            content=response_text,
        )
        self.db.add(assistant_msg)
        await self.db.flush()

        if conv.title == "New Conversation":
            conv.title = message[:100]

        await self.db.flush()
        return response_text, conv.id, assistant_msg.id

    async def get_conversation_history(
        self, conversation_id: UUID, limit: int = 50
    ) -> list[AIMessage]:
        result = await self.db.execute(
            select(AIMessage)
            .where(AIMessage.conversation_id == conversation_id)
            .order_by(AIMessage.created_at.asc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def list_conversations(
        self, project_id: UUID, user_id: UUID, status: str = "active"
    ) -> list[AIConversation]:
        result = await self.db.execute(
            select(AIConversation)
            .where(
                AIConversation.project_id == project_id,
                AIConversation.user_id == user_id,
                AIConversation.status == status,
            )
            .order_by(AIConversation.updated_at.desc())
        )
        return list(result.scalars().all())

    async def _get_history(self, conversation_id: UUID) -> list[dict[str, str]]:
        messages = await self.get_conversation_history(conversation_id)
        return [{"role": m.role.value, "content": m.content} for m in messages]

    def _build_system_prompt(self, project_id: UUID, context: dict | None = None) -> str:
        base = (
            "You are an AI project management assistant. You help users manage their projects, "
            "tasks, schedules, and provide insights. Be concise, helpful, and professional."
        )
        if context:
            base += f"\n\nProject context: {context}"
        return base
