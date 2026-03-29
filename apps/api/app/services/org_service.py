from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import DuplicateError, ForbiddenError, NotFoundError
from app.models.organization import OrgMembership, OrgRole, Organization
from app.models.user import User
from app.schemas.organization import OrgCreate, OrgMemberCreate, OrgUpdate


class OrgService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, data: OrgCreate, owner_id: UUID) -> Organization:
        existing = await self.db.execute(select(Organization).where(Organization.slug == data.slug))
        if existing.scalar_one_or_none():
            raise DuplicateError("Organization slug already exists")
        org = Organization(name=data.name, slug=data.slug, description=data.description)
        self.db.add(org)
        await self.db.flush()
        membership = OrgMembership(org_id=org.id, user_id=owner_id, role=OrgRole.OWNER)
        self.db.add(membership)
        await self.db.flush()
        return org

    async def get(self, org_id: UUID) -> Organization:
        result = await self.db.execute(select(Organization).where(Organization.id == org_id))
        org = result.scalar_one_or_none()
        if not org:
            raise NotFoundError("Organization not found")
        return org

    async def update(self, org_id: UUID, data: OrgUpdate) -> Organization:
        org = await self.get(org_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(org, field, value)
        await self.db.flush()
        return org

    async def list_members(self, org_id: UUID) -> list[OrgMembership]:
        result = await self.db.execute(
            select(OrgMembership)
            .where(OrgMembership.org_id == org_id)
            .join(User, OrgMembership.user_id == User.id)
            .order_by(User.name)
        )
        return list(result.scalars().all())

    async def add_member(self, org_id: UUID, data: OrgMemberCreate) -> OrgMembership:
        existing = await self.db.execute(
            select(OrgMembership).where(
                OrgMembership.org_id == org_id, OrgMembership.user_id == UUID(data.user_id)
            )
        )
        if existing.scalar_one_or_none():
            raise DuplicateError("User is already a member")
        membership = OrgMembership(
            org_id=org_id,
            user_id=UUID(data.user_id),
            role=OrgRole(data.role),
        )
        self.db.add(membership)
        await self.db.flush()
        return membership

    async def remove_member(self, org_id: UUID, user_id: UUID) -> None:
        result = await self.db.execute(
            select(OrgMembership).where(
                OrgMembership.org_id == org_id, OrgMembership.user_id == user_id
            )
        )
        membership = result.scalar_one_or_none()
        if not membership:
            raise NotFoundError("Membership not found")
        if membership.role == OrgRole.OWNER:
            raise ForbiddenError("Cannot remove organization owner")
        await self.db.delete(membership)
        await self.db.flush()

    async def check_role(self, org_id: UUID, user_id: UUID, required_roles: list[OrgRole]) -> OrgRole:
        result = await self.db.execute(
            select(OrgMembership).where(
                OrgMembership.org_id == org_id, OrgMembership.user_id == user_id
            )
        )
        membership = result.scalar_one_or_none()
        if not membership:
            raise ForbiddenError("Not a member of this organization")
        if membership.role not in required_roles:
            raise ForbiddenError("Insufficient permissions")
        return membership.role

    async def list_user_orgs(self, user_id: UUID) -> list[Organization]:
        result = await self.db.execute(
            select(Organization)
            .join(OrgMembership, OrgMembership.org_id == Organization.id)
            .where(OrgMembership.user_id == user_id)
            .order_by(Organization.name)
        )
        return list(result.scalars().all())
