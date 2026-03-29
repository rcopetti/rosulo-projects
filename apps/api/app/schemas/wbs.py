from pydantic import BaseModel, Field


class WBSItemCreate(BaseModel):
    parent_id: str | None = None
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    type: str = "work_package"
    sort_order: int = 0


class WBSItemUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    type: str | None = None
    sort_order: int | None = None
    parent_id: str | None = None


class WBSItemResponse(BaseModel):
    id: str
    project_id: str
    parent_id: str | None = None
    code: str
    name: str
    description: str | None = None
    type: str
    level: int
    sort_order: int
    children: list["WBSItemResponse"] = []
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


class WBSTreeResponse(BaseModel):
    items: list[WBSItemResponse]
    total_count: int
