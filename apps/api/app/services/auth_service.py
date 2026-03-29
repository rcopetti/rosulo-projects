from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import DuplicateError, InvalidCredentialsError, NotFoundError, UnauthorizedError
from app.core.security import create_access_token, create_refresh_token, get_password_hash, verify_password
from app.models.organization import OrgMembership, OrgRole, Organization
from app.models.user import User
from app.schemas.auth import TokenPair, UserCreate


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def register(self, data: UserCreate) -> TokenPair:
        existing = await self.db.execute(select(User).where(User.email == data.email))
        if existing.scalar_one_or_none():
            raise DuplicateError("Email already registered")

        user = User(
            email=data.email,
            name=data.name,
            hashed_password=get_password_hash(data.password),
        )
        self.db.add(user)
        await self.db.flush()

        slug = self._generate_org_slug(data.name, data.email)
        org = Organization(name=f"{data.name}'s Organization", slug=slug)
        self.db.add(org)
        await self.db.flush()

        membership = OrgMembership(org_id=org.id, user_id=user.id, role=OrgRole.OWNER)
        self.db.add(membership)
        await self.db.flush()

        return TokenPair(
            access_token=create_access_token(user.id),
            refresh_token=create_refresh_token(user.id),
        )

    async def login(self, email: str, password: str) -> TokenPair:
        result = await self.db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if not user or not user.hashed_password:
            raise InvalidCredentialsError()
        if not verify_password(password, user.hashed_password):
            raise InvalidCredentialsError()
        if not user.is_active:
            raise UnauthorizedError("Account is disabled")
        return TokenPair(
            access_token=create_access_token(user.id),
            refresh_token=create_refresh_token(user.id),
        )

    async def refresh(self, refresh_token: str) -> TokenPair:
        from app.core.security import verify_token

        payload = verify_token(refresh_token, token_type="refresh")
        user_id = UUID(payload["sub"])
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user or not user.is_active:
            raise UnauthorizedError("Invalid refresh token")
        return TokenPair(
            access_token=create_access_token(user.id),
            refresh_token=create_refresh_token(user.id),
        )

    async def get_user_by_id(self, user_id: UUID) -> User:
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise NotFoundError("User not found")
        return user

    @staticmethod
    def _generate_org_slug(name: str, email: str) -> str:
        import re

        base = name.lower().strip()
        base = re.sub(r"[^a-z0-9]+", "-", base).strip("-")
        if not base:
            base = email.split("@")[0].lower()
            base = re.sub(r"[^a-z0-9]+", "-", base).strip("-")
        suffix = email.split("@")[0][:4].lower()
        return f"{base}-{suffix}"
