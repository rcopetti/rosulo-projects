from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    APP_NAME: str = "PM AI Platform"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/pm_ai"
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 10

    REDIS_URL: str = "redis://localhost:6379/0"

    JWT_SECRET_KEY: str = Field(default="change-me-in-production")
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    OAUTH_GOOGLE_CLIENT_ID: str = ""
    OAUTH_GOOGLE_CLIENT_SECRET: str = ""
    OAUTH_GITHUB_CLIENT_ID: str = ""
    OAUTH_GITHUB_CLIENT_SECRET: str = ""

    AWS_REGION: str = "us-east-1"
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_BEDROCK_MODEL_ID: str = "anthropic.claude-3-sonnet-20240229-v1:0"
    AWS_BEDROCK_HAIKU_MODEL_ID: str = "anthropic.claude-3-haiku-20240307-v1:0"
    AWS_S3_VECTORS_BUCKET: str = "pm-ai-vectors"
    AWS_S3_DOCUMENTS_BUCKET: str = "pm-ai-documents"

    AI_MAX_TOKENS_PER_REQUEST: int = 4096
    AI_DAILY_BUDGET_USD: float = 50.0
    AI_MONTHLY_BUDGET_USD: float = 500.0
    AI_MAX_CONVERSATION_HISTORY: int = 50
    AI_CONTENT_SAFETY_ENABLED: bool = True

    LITELLM_PROVIDER: str = "bedrock"
    LITELLM_API_BASE: str = ""

    CORS_ORIGINS: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])
    SENTRY_DSN: str = ""


settings = Settings()
