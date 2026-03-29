from pydantic import BaseModel, Field


class OrgCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    slug: str = Field(min_length=1, max_length=255, pattern=r"^[a-z0-9-]+$")
    description: str | None = None


class OrgUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    avatar_url: str | None = None


class OrgResponse(BaseModel):
    id: str
    name: str
    slug: str
    description: str | None = None
    avatar_url: str | None = None
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


class OrgMemberCreate(BaseModel):
    user_id: str
    role: str = "member"


class OrgMemberResponse(BaseModel):
    id: str
    org_id: str
    user_id: str
    role: str
    user_email: str | None = None
    user_name: str | None = None
    created_at: str

    model_config = {"from_attributes": True}
