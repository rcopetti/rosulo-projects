from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    def __init__(self, message: str, status_code: int = 400, error_code: str = "APP_ERROR"):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        super().__init__(message)


class NotFoundError(AppError):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message=message, status_code=404, error_code="NOT_FOUND")


class DuplicateError(AppError):
    def __init__(self, message: str = "Resource already exists"):
        super().__init__(message=message, status_code=409, error_code="DUPLICATE")


class ForbiddenError(AppError):
    def __init__(self, message: str = "Forbidden"):
        super().__init__(message=message, status_code=403, error_code="FORBIDDEN")


class ValidationError(AppError):
    def __init__(self, message: str = "Validation error"):
        super().__init__(message=message, status_code=422, error_code="VALIDATION_ERROR")


class AIBudgetExceededError(AppError):
    def __init__(self, message: str = "AI budget exceeded"):
        super().__init__(message=message, status_code=402, error_code="AI_BUDGET_EXCEEDED")


class ConflictError(AppError):
    def __init__(self, message: str = "Cannot delete due to existing references"):
        super().__init__(message=message, status_code=409, error_code="CONFLICT")


class UnauthorizedError(AppError):
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(message=message, status_code=401, error_code="UNAUTHORIZED")


class InvalidCredentialsError(AppError):
    def __init__(self) -> None:
        super().__init__(message="Invalid email or password", status_code=401, error_code="INVALID_CREDENTIALS")


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": exc.error_code,
                "message": exc.message,
                "path": str(request.url.path),
            },
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=500,
            content={
                "error": "INTERNAL_ERROR",
                "message": "An internal error occurred",
                "path": str(request.url.path),
            },
        )
