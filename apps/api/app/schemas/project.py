from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    methodology: str = "agile"
    priority: str = "medium"
    start_date: str | None = None
    end_date: str | None = None
    budget: float | None = None
    budget_currency: str = "USD"
    ai_enabled: bool = False
    charter: dict | None = None


class ProjectUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    methodology: str | None = None
    status: str | None = None
    priority: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    budget: float | None = None
    budget_currency: str | None = None
    complexity_score: int | None = None
    risk_level: str | None = None
    ai_enabled: bool | None = None
    ai_model_preference: str | None = None
    ai_budget_limit: float | None = None
    charter: dict | None = None


class ProjectResponse(BaseModel):
    id: str
    org_id: str
    name: str
    description: str | None = None
    methodology: str
    status: str
    priority: str
    start_date: str | None = None
    end_date: str | None = None
    budget: float | None = None
    budget_currency: str
    complexity_score: int | None = None
    risk_level: str | None = None
    ai_enabled: bool
    ai_model_preference: str | None = None
    ai_budget_limit: float | None = None
    charter: dict | None = None
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


class ProjectMemberCreate(BaseModel):
    user_id: str
    role: str = "member"
    hourly_rate: float | None = None


class ProjectMemberResponse(BaseModel):
    id: str
    project_id: str
    user_id: str
    role: str
    hourly_rate: float | None = None
    user_email: str | None = None
    user_name: str | None = None
    created_at: str

    model_config = {"from_attributes": True}
