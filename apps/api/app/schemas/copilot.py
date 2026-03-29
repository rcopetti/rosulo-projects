from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=10000)
    conversation_id: str | None = None
    project_id: str
    context: dict | None = None


class ChatResponse(BaseModel):
    message: str
    conversation_id: str
    message_id: str
    metadata: dict | None = None


class ConversationResponse(BaseModel):
    id: str
    project_id: str
    user_id: str
    title: str
    status: str
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    metadata: dict | None = None
    created_at: str

    model_config = {"from_attributes": True}


class WSMessage(BaseModel):
    type: str
    content: str | None = None
    conversation_id: str | None = None
    project_id: str | None = None
    metadata: dict | None = None
