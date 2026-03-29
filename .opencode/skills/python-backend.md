# Python Backend & REST API Skill

## Overview

Production-grade Python backend services with FastAPI, async patterns, and RESTful API design.

---

## Tech Stack

- **Framework**: FastAPI 0.110+
- **Runtime**: Python 3.12+
- **ORM**: SQLAlchemy 2.0 (async) with Alembic migrations
- **Validation**: Pydantic v2 (integrated with FastAPI)
- **Task Queue**: Celery + Redis (for async jobs)
- **Testing**: pytest + httpx (async client) + factory_boy
- **Linting/Formatting**: Ruff (replaces black, isort, flake8)
- **Type Checking**: mypy (strict mode)

---

## Project Structure

```
app/
  api/
    v1/
      endpoints/        # Route handlers grouped by resource
        users.py
        projects.py
      router.py          # Aggregates v1 endpoints
    deps.py              # Shared dependencies (auth, db session)
  core/
    config.py            # Settings via pydantic-settings
    security.py          # JWT, password hashing, auth utilities
    exceptions.py        # Custom exception classes + handlers
  db/
    base.py              # Base model, engine setup
    session.py           # Async session factory
    migrations/          # Alembic migrations
  models/               # SQLAlchemy ORM models
    user.py
    project.py
  schemas/              # Pydantic request/response schemas
    user.py
    project.py
  services/             # Business logic layer (thin routes, fat services)
    user_service.py
    project_service.py
  utils/                # Pure utility functions
  main.py               # FastAPI app factory, middleware, startup
tests/
  unit/
  integration/
  conftest.py           # Shared fixtures
```

---

## Coding Conventions

### API Design

- RESTful resource naming: `/api/v1/users`, `/api/v1/users/{id}`
- Plural nouns for collections, singular is not used.
- Version prefix: `/api/v1/`, `/api/v2/`
- HTTP methods: GET (read), POST (create), PUT (full update), PATCH (partial), DELETE
- Query params for filtering, sorting, pagination.
- Consistent error response shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "details": [...]
  }
}
```

### Route Handlers

- Thin controllers: validate input, call service, return response.
- No business logic in route handlers.
- Use dependency injection for DB session, current user, permissions.

```python
from fastapi import APIRouter, Depends
from app.schemas.user import UserCreate, UserResponse
from app.services.user_service import UserService
from app.api.deps import get_user_service, get_current_user

router = APIRouter(prefix="/users", tags=["users"])

@router.post("/", response_model=UserResponse, status_code=201)
async def create_user(
    payload: UserCreate,
    service: UserService = Depends(get_user_service),
    _: User = Depends(get_current_user),
):
    return await service.create(payload)
```

### Pydantic Schemas

- Separate schemas for request, response, and internal use.
- Use `model_config = ConfigDict(from_attributes=True)` for ORM integration.
- Strict types: no `Any`, use `Literal` for enums, `Annotated` for constraints.

```python
from pydantic import BaseModel, EmailStr, ConfigDict

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    email: str
    name: str
    created_at: datetime
```

### Services (Business Logic)

- One service per domain/resource.
- Services receive DB session via constructor injection.
- Raise domain exceptions, not HTTP exceptions.
- Pure Python: no FastAPI imports in service layer.

```python
class UserService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, data: UserCreate) -> User:
        if await self._email_exists(data.email):
            raise DuplicateEmailError(data.email)
        user = User(**data.model_dump())
        self.session.add(user)
        await self.session.commit()
        return user
```

### Database / SQLAlchemy

- Async engine + async sessions exclusively.
- Declarative models with `Mapped` type annotations.
- Alembic for all schema changes (no autogenerate in production without review).
- Soft deletes via `deleted_at` column where appropriate.

```python
from sqlalchemy.orm import Mapped, mapped_column

class User(Base):
    __tablename__ = "users"
    
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    email: Mapped[str] = mapped_column(unique=True, index=True)
    name: Mapped[str]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
```

### Error Handling

- Custom exception hierarchy rooted in `AppError`.
- Global exception handler translates `AppError` to HTTP responses.
- Never expose stack traces in production.

```python
class AppError(Exception):
    code: str = "INTERNAL_ERROR"
    status: int = 500

class NotFoundError(AppError):
    code = "NOT_FOUND"
    status = 404

class DuplicateEmailError(AppError):
    code = "DUPLICATE_EMAIL"
    status = 409
```

### Authentication & Security

- JWT access tokens (short-lived) + refresh tokens (long-lived, rotated).
- Passwords hashed with `bcrypt` or `argon2`.
- Role-based access control (RBAC) via dependencies.
- CORS configured per environment.
- Rate limiting via `slowapi` or middleware.
- Input validation enforced at schema level (Pydantic).

### Async Patterns

- `async def` for all I/O-bound handlers.
- `asyncio.gather()` for parallel independent operations.
- Celery for background tasks (email, file processing, etc.).
- Avoid blocking calls in async context (use `run_in_executor` if unavoidable).

---

## Testing Strategy

| Layer | Tool | Scope |
|-------|------|-------|
| Unit | pytest | Services, utilities, pure logic |
| Integration | pytest + httpx.AsyncClient | API endpoints with test DB |
| Contract | schemathesis | OpenAPI spec conformance |

- Test database: SQLite in-memory or Postgres via testcontainers.
- Fixtures for DB session, test client, authenticated user.
- Factory pattern (factory_boy) for test data generation.
- Aim for >80% coverage on services and endpoints.

```python
@pytest_asyncio.fixture
async def client(session: AsyncSession):
    app.dependency_overrides[get_db] = lambda: session
    async with AsyncClient(app=app, base_url="http://test") as c:
        yield c
```

---

## Configuration

- `pydantic-settings` for typed config with env loading.
- `.env` for local, environment variables for production.
- Never hardcode secrets.

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    redis_url: str = "redis://localhost:6379"
    
    model_config = {"env_file": ".env"}
```

---

## Middleware & Cross-Cutting

- Request ID middleware for tracing.
- Structured logging (structlog or loguru).
- CORS middleware.
- Trusted host middleware in production.
- Health check endpoint: `GET /health`.
