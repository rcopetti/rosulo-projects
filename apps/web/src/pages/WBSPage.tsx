import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useWBSTree, useCreateWBSItem, useDeleteWBSItem, useUpdateWBSItem } from '@/hooks/useWBS'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { Plus, ChevronRight, ChevronDown, Trash2, Pencil, Sparkles } from 'lucide-react'
import type { WBSItem } from '@/types'

export function WBSPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { data: wbsTree, isLoading } = useWBSTree(projectId!)
  const createItem = useCreateWBSItem(projectId!)
  const deleteItem = useDeleteWBSItem(projectId!)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [parentId, setParentId] = useState<string | undefined>()

  const items = wbsTree?.items || []

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleAddItem(parent?: string) {
    setParentId(parent)
    setDialogOpen(true)
  }

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    createItem.mutate(
      {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        parent_id: parentId,
        level: parentId ? 1 : 0,
        sort_order: 0,
        code: 'WBS-' + Date.now(),
      },
      { onSuccess: () => setDialogOpen(false) }
    )
  }

  function handleDelete(id: string) {
    deleteItem.mutate(id)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  const rootItems = items.filter((i) => !i.parent_id)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Work Breakdown Structure</h2>
        <div className="flex gap-2">
          <Button variant="outline">
            <Sparkles className="mr-2 h-4 w-4" />
            AI Generate
          </Button>
          <Button onClick={() => handleAddItem()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        {rootItems.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            <p>No WBS items yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="divide-y">
            {rootItems.map((item) => (
              <WBSTreeNode
                key={item.id}
                item={item}
                allItems={items}
                expandedIds={expandedIds}
                onToggle={toggleExpand}
                onAdd={handleAddItem}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add WBS Item</DialogTitle>
            <DialogDescription>
              {parentId ? 'Add a child item to the selected WBS element.' : 'Add a new top-level WBS element.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wbs-name">Name</Label>
              <Input id="wbs-name" name="name" placeholder="Item name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wbs-desc">Description</Label>
              <Input id="wbs-desc" name="description" placeholder="Optional description" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createItem.isPending}>Add Item</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface WBSTreeNodeProps {
  item: WBSItem
  allItems: WBSItem[]
  expandedIds: Set<string>
  onToggle: (id: string) => void
  onAdd: (parentId: string) => void
  onDelete: (id: string) => void
}

function WBSTreeNode({ item, allItems, expandedIds, onToggle, onAdd, onDelete }: WBSTreeNodeProps) {
  const children = allItems.filter((i) => i.parent_id === item.id)
  const hasChildren = children.length > 0
  const isExpanded = expandedIds.has(item.id)

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-2 px-4 py-3 hover:bg-muted/50',
          item.level > 0 && 'border-l-2 border-muted'
        )}
        style={{ paddingLeft: `${(item.level + 1) * 1}rem` }}
      >
        <button
          onClick={() => onToggle(item.id)}
          className="flex h-5 w-5 items-center justify-center text-muted-foreground hover:text-foreground"
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
          ) : (
            <span className="h-4 w-4" />
          )}
        </button>

        <span className="font-mono text-xs text-muted-foreground">{item.code}</span>
        <span className="flex-1 font-medium">{item.name}</span>
        {item.description && (
          <span className="text-sm text-muted-foreground">{item.description}</span>
        )}

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onAdd(item.id)}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(item.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div>
          {children.map((child) => (
            <WBSTreeNode
              key={child.id}
              item={child}
              allItems={allItems}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onAdd={onAdd}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
