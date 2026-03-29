import json
from uuid import UUID

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_session
from app.core.security import verify_token
from app.services.ai.copilot_service import CopilotService

router = APIRouter()


@router.websocket("/ws/copilot/{conversation_id}")
async def copilot_websocket(
    websocket: WebSocket,
    conversation_id: str,
) -> None:
    await websocket.accept()

    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001, reason="Missing token")
        return

    try:
        payload = verify_token(token, token_type="access")
        user_id = UUID(payload["sub"])
    except Exception:
        await websocket.close(code=4001, reason="Invalid token")
        return

    async for db in get_session():
        service = CopilotService(db)
        try:
            while True:
                data = await websocket.receive_text()
                message_data = json.loads(data)

                if message_data.get("type") == "message":
                    project_id = UUID(message_data.get("project_id", ""))
                    message = message_data.get("content", "")

                    conv = await service.get_or_create_conversation(
                        project_id, user_id, UUID(conversation_id)
                    )

                    from app.models.copilot import AIMessage, MessageRole

                    user_msg = AIMessage(
                        conversation_id=conv.id,
                        role=MessageRole.USER,
                        content=message,
                    )
                    db.add(user_msg)
                    await db.flush()

                    history = await service._get_history(conv.id)
                    system_prompt = service._build_system_prompt(project_id)
                    messages = [{"role": "system", "content": system_prompt}] + history

                    full_response = ""
                    async for token_text in service.llm.complete_streaming(messages):
                        full_response += token_text
                        await websocket.send_json({
                            "type": "token",
                            "content": token_text,
                            "conversation_id": str(conv.id),
                        })

                    assistant_msg = AIMessage(
                        conversation_id=conv.id,
                        role=MessageRole.ASSISTANT,
                        content=full_response,
                    )
                    db.add(assistant_msg)
                    await db.flush()

                    await websocket.send_json({
                        "type": "done",
                        "message_id": str(assistant_msg.id),
                        "conversation_id": str(conv.id),
                    })

                elif message_data.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})

        except WebSocketDisconnect:
            pass
        except Exception as e:
            await websocket.send_json({"type": "error", "message": str(e)})
        finally:
            await db.close()
