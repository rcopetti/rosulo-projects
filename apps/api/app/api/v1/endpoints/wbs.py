from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_session
from app.models.user import User
from app.schemas.wbs import WBSItemCreate, WBSItemResponse, WBSItemUpdate, WBSTreeResponse
from app.services.wbs_service import WBSService

router = APIRouter()


@router.post("/projects/{project_id}/wbs", response_model=WBSItemResponse, status_code=201)
async def create_wbs_item(
    project_id: UUID,
    data: WBSItemCreate,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> WBSItemResponse:
    service = WBSService(db)
    item = await service.create_item(project_id, data)
    return _item_to_response(item)


@router.get("/projects/{project_id}/wbs", response_model=WBSTreeResponse)
async def get_wbs_tree(
    project_id: UUID,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> WBSTreeResponse:
    service = WBSService(db)
    items = await service.get_tree(project_id)
    return WBSTreeResponse(
        items=[_item_to_response(i) for i in items],
        total_count=len(items),
    )


@router.patch("/wbs/{item_id}", response_model=WBSItemResponse)
async def update_wbs_item(
    item_id: UUID,
    data: WBSItemUpdate,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> WBSItemResponse:
    service = WBSService(db)
    item = await service.update_item(item_id, data)
    return _item_to_response(item)


@router.delete("/wbs/{item_id}", status_code=204)
async def delete_wbs_item(
    item_id: UUID,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
) -> None:
    service = WBSService(db)
    await service.delete_item(item_id)


def _item_to_response(item: any) -> WBSItemResponse:
    children_list = []
    
    if hasattr(item, "__dict__") and "children" in item.__dict__ and item.children:
        children_list = [_item_to_response(c) for c in item.children]
    elif not hasattr(item, "__dict__") and getattr(item, "children", None):
        children_list = [_item_to_response(c) for c in item.children]

    return WBSItemResponse(
        id=str(item.id),
        project_id=str(item.project_id),
        parent_id=str(item.parent_id) if item.parent_id else None,
        code=item.code,
        name=item.name,
        description=item.description,
        type=item.type.value if hasattr(item.type, "value") else item.type,
        level=item.level,
        sort_order=item.sort_order,
        children=children_list,
        created_at=item.created_at.isoformat(),
        updated_at=item.updated_at.isoformat(),
    )
