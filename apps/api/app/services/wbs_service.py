import uuid
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.wbs import WBSItem, WBSItemType
from app.schemas.wbs import WBSItemCreate, WBSItemUpdate


class WBSService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_item(self, project_id: UUID, data: WBSItemCreate) -> WBSItem:
        level = 0
        code = ""
        if data.parent_id:
            parent = await self.db.execute(
                select(WBSItem).where(WBSItem.id == UUID(data.parent_id))
            )
            parent_item = parent.scalar_one_or_none()
            if not parent_item:
                raise NotFoundError("Parent WBS item not found")
            level = parent_item.level + 1
            sibling_count = await self.db.execute(
                select(func.count(WBSItem.id)).where(WBSItem.parent_id == UUID(data.parent_id))
            )
            count = sibling_count.scalar() or 0
            code = f"{parent_item.code}.{count + 1}"
        else:
            root_count = await self.db.execute(
                select(func.count(WBSItem.id)).where(
                    WBSItem.project_id == project_id, WBSItem.parent_id.is_(None)
                )
            )
            count = root_count.scalar() or 0
            code = str(count + 1)

        item = WBSItem(
            project_id=project_id,
            parent_id=UUID(data.parent_id) if data.parent_id else None,
            code=code,
            name=data.name,
            description=data.description,
            type=WBSItemType(data.type),
            level=level,
            sort_order=data.sort_order,
        )
        self.db.add(item)
        await self.db.flush()
        return item

    async def get_tree(self, project_id: UUID) -> list[WBSItem]:
        result = await self.db.execute(
            select(WBSItem)
            .where(WBSItem.project_id == project_id)
            .order_by(WBSItem.level, WBSItem.sort_order, WBSItem.code)
        )
        items = list(result.scalars().all())
        return self._build_tree(items)

    def _build_tree(self, items: list[WBSItem]) -> list[WBSItem]:
        item_map: dict[UUID, WBSItem] = {item.id: item for item in items}
        roots: list[WBSItem] = []

        for item in items:
            item.children = []

        for item in items:
            if item.parent_id and item.parent_id in item_map:
                item_map[item.parent_id].children.append(item)
            else:
                roots.append(item)
        return roots

    async def update_item(self, item_id: UUID, data: WBSItemUpdate) -> WBSItem:
        result = await self.db.execute(select(WBSItem).where(WBSItem.id == item_id))
        item = result.scalar_one_or_none()
        if not item:
            raise NotFoundError("WBS item not found")
        for field, value in data.model_dump(exclude_unset=True).items():
            if field == "type" and value:
                setattr(item, field, WBSItemType(value))
            elif field == "parent_id" and value:
                setattr(item, field, UUID(value))
            else:
                setattr(item, field, value)
        await self.db.flush()
        return item

    async def delete_item(self, item_id: UUID) -> None:
        result = await self.db.execute(select(WBSItem).where(WBSItem.id == item_id))
        item = result.scalar_one_or_none()
        if not item:
            raise NotFoundError("WBS item not found")
        await self._delete_recursive(item)

    async def _delete_recursive(self, item: WBSItem) -> None:
        result = await self.db.execute(select(WBSItem).where(WBSItem.parent_id == item.id))
        children = list(result.scalars().all())
        for child in children:
            await self._delete_recursive(child)
        await self.db.delete(item)

    async def generate_codes(self, project_id: UUID) -> None:
        result = await self.db.execute(
            select(WBSItem)
            .where(WBSItem.project_id == project_id)
            .order_by(WBSItem.level, WBSItem.sort_order)
        )
        items = list(result.scalars().all())
        counters: dict[UUID | None, int] = {}
        for item in items:
            parent_key = item.parent_id
            counters[parent_key] = counters.get(parent_key, 0) + 1
            if item.parent_id:
                parent = await self.db.execute(select(WBSItem).where(WBSItem.id == item.parent_id))
                parent_item = parent.scalar_one_or_none()
                if parent_item:
                    item.code = f"{parent_item.code}.{counters[parent_key]}"
            else:
                item.code = str(counters[parent_key])
        await self.db.flush()
