from pydantic import BaseModel, Field


class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class SortParams(BaseModel):
    sort_by: str = "created_at"
    sort_order: str = Field(default="desc", pattern=r"^(asc|desc)$")


class ErrorResponse(BaseModel):
    error: str
    message: str
    path: str | None = None


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "0.1.0"
