from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_session, require_org_role
from app.models.organization import OrgRole
from app.models.user import User
from app.schemas.organization import (
    OrgCreate,
    OrgMemberCreate,
    OrgMemberResponse,
    OrgResponse,
    OrgUpdate,
)
from app.services.org_service import OrgService

router = APIRouter()


@router.get("/users/me/orgs", response_model=list[OrgResponse])
async def list_my_orgs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> list[OrgResponse]:
    service = OrgService(db)
    orgs = await service.list_user_orgs(current_user.id)
    return [
        OrgResponse(
            id=str(org.id),
            name=org.name,
            slug=org.slug,
            description=org.description,
            avatar_url=org.avatar_url,
            created_at=org.created_at.isoformat(),
            updated_at=org.updated_at.isoformat(),
        )
        for org in orgs
    ]


@router.post("/orgs", response_model=OrgResponse, status_code=201)
async def create_org(
    data: OrgCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> OrgResponse:
    service = OrgService(db)
    org = await service.create(data, current_user.id)
    return OrgResponse(
        id=str(org.id),
        name=org.name,
        slug=org.slug,
        description=org.description,
        avatar_url=org.avatar_url,
        created_at=org.created_at.isoformat(),
        updated_at=org.updated_at.isoformat(),
    )


@router.get("/orgs/{org_id}", response_model=OrgResponse)
async def get_org(
    org_id: UUID,
    _: OrgRole = Depends(require_org_role([OrgRole.OWNER, OrgRole.ADMIN, OrgRole.MEMBER, OrgRole.VIEWER])),
    db: AsyncSession = Depends(get_session),
) -> OrgResponse:
    service = OrgService(db)
    org = await service.get(org_id)
    return OrgResponse(
        id=str(org.id),
        name=org.name,
        slug=org.slug,
        description=org.description,
        avatar_url=org.avatar_url,
        created_at=org.created_at.isoformat(),
        updated_at=org.updated_at.isoformat(),
    )


@router.patch("/orgs/{org_id}", response_model=OrgResponse)
async def update_org(
    org_id: UUID,
    data: OrgUpdate,
    _: OrgRole = Depends(require_org_role([OrgRole.OWNER, OrgRole.ADMIN])),
    db: AsyncSession = Depends(get_session),
) -> OrgResponse:
    service = OrgService(db)
    org = await service.update(org_id, data)
    return OrgResponse(
        id=str(org.id),
        name=org.name,
        slug=org.slug,
        description=org.description,
        avatar_url=org.avatar_url,
        created_at=org.created_at.isoformat(),
        updated_at=org.updated_at.isoformat(),
    )


@router.get("/orgs/{org_id}/members", response_model=list[OrgMemberResponse])
async def list_org_members(
    org_id: UUID,
    _: OrgRole = Depends(require_org_role([OrgRole.OWNER, OrgRole.ADMIN, OrgRole.MEMBER, OrgRole.VIEWER])),
    db: AsyncSession = Depends(get_session),
) -> list[OrgMemberResponse]:
    service = OrgService(db)
    members = await service.list_members(org_id)
    return [
        OrgMemberResponse(
            id=str(m.id),
            org_id=str(m.org_id),
            user_id=str(m.user_id),
            role=m.role.value,
            user_email=m.user.email if m.user else None,
            user_name=m.user.name if m.user else None,
            created_at=m.created_at.isoformat(),
        )
        for m in members
    ]


@router.post("/orgs/{org_id}/members", response_model=OrgMemberResponse, status_code=201)
async def add_org_member(
    org_id: UUID,
    data: OrgMemberCreate,
    _: OrgRole = Depends(require_org_role([OrgRole.OWNER, OrgRole.ADMIN])),
    db: AsyncSession = Depends(get_session),
) -> OrgMemberResponse:
    service = OrgService(db)
    membership = await service.add_member(org_id, data)
    return OrgMemberResponse(
        id=str(membership.id),
        org_id=str(membership.org_id),
        user_id=str(membership.user_id),
        role=membership.role.value,
        created_at=membership.created_at.isoformat(),
    )


@router.delete("/orgs/{org_id}/members/{user_id}", status_code=204)
async def remove_org_member(
    org_id: UUID,
    user_id: UUID,
    _: OrgRole = Depends(require_org_role([OrgRole.OWNER, OrgRole.ADMIN])),
    db: AsyncSession = Depends(get_session),
) -> None:
    service = OrgService(db)
    await service.remove_member(org_id, user_id)
