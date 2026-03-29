from fastapi import APIRouter

from app.api.v1.endpoints import auth, copilot, health, orgs, projects, schedule, tasks, wbs

api_router = APIRouter()

api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(orgs.router, tags=["organizations"])
api_router.include_router(projects.router, tags=["projects"])
api_router.include_router(wbs.router, tags=["wbs"])
api_router.include_router(tasks.router, tags=["tasks"])
api_router.include_router(schedule.router, tags=["schedule"])
api_router.include_router(copilot.router, prefix="/copilot", tags=["copilot"])
