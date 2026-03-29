from pydantic import BaseModel, Field


class MilestoneCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    target_date: str
    status: str = "upcoming"


class MilestoneUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    target_date: str | None = None
    completed_date: str | None = None
    status: str | None = None


class MilestoneResponse(BaseModel):
    id: str
    project_id: str
    name: str
    description: str | None = None
    target_date: str
    completed_date: str | None = None
    status: str
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}
