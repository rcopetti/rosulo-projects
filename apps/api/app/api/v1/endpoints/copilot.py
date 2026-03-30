from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_session
from app.models.user import User
from app.schemas.copilot import ChatRequest, ChatResponse, ConversationResponse, MessageResponse
from app.services.ai.copilot_service import CopilotService
from app.models.copilot import AIConversation, AIMessage

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(
    data: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> ChatResponse:
    service = CopilotService(db)
    response_text, conv_id, msg_id = await service.process_message(
        project_id=UUID(data.project_id),
        user_id=current_user.id,
        message=data.message,
        conversation_id=UUID(data.conversation_id) if data.conversation_id else None,
        context=data.context,
    )
    return ChatResponse(
        message=response_text,
        conversation_id=str(conv_id),
        message_id=str(msg_id),
    )


@router.get("/conversations", response_model=list[ConversationResponse])
async def list_conversations(
    project_id: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> list[ConversationResponse]:
    service = CopilotService(db)
    conversations = await service.list_conversations(UUID(project_id), current_user.id)
    return [
        ConversationResponse(
            id=str(c.id),
            project_id=str(c.project_id),
            user_id=str(c.user_id),
            title=c.title,
            status=c.status.value,
            created_at=c.created_at.isoformat(),
            updated_at=c.updated_at.isoformat(),
        )
        for c in conversations
    ]


@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageResponse])
async def get_conversation_messages(
    conversation_id: UUID,
    limit: int = Query(50, ge=1, le=200),
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> list[MessageResponse]:
    service = CopilotService(db)
    messages = await service.get_conversation_history(conversation_id, limit)
    return [
        MessageResponse(
            id=str(m.id),
            conversation_id=str(m.conversation_id),
            role=m.role.value,
            content=m.content,
            metadata=m.metadata_,
            created_at=m.created_at.isoformat(),
        )
        for m in messages
    ]


@router.delete("/conversations/{conversation_id}", status_code=204)
async def delete_conversation(
    conversation_id: UUID,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> None:
    from sqlalchemy import delete as sa_delete

    await db.execute(sa_delete(AIMessage).where(AIMessage.conversation_id == conversation_id))
    await db.execute(sa_delete(AIConversation).where(AIConversation.id == conversation_id))
    await db.flush()
