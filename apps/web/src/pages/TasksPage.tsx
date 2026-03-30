import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '@/hooks/useTasks'
import { useWBSTree } from '@/hooks/useWBS'
import { TaskDetailPanel } from '@/components/features/tasks/TaskDetailPanel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatDate, cn } from '@/lib/utils'
import {
  TASK_STATUSES,
  TASK_PRIORITIES,
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_COLORS,
  TASK_PRIORITY_COLORS,
} from '@/lib/constants'
import {
  Plus,
  Filter,
  Pencil,
  Trash2,
  ChevronRight,
  Clock,
  Calendar,
  Tag,
  BarChart3,
  Search,
  LayoutGrid,
  List,
  ArrowUpDown,
  GitBranch,
  Layers,
} from 'lucide-react'
import type { Task, WBSItem } from '@/types'

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status: z.string().default('todo'),
  priority: z.string().default('medium'),
  wbs_item_id: z.string().optional(),
  parent_task_id: z.string().optional(),
  estimated_hours: z.union([z.coerce.number().min(0), z.literal('')]).optional(),
  start_date: z.string().optional(),
  due_date: z.string().optional(),
  tags: z.string().optional(),
})

type TaskForm = z.infer<typeof taskSchema>

type ViewMode = 'list' | 'board'

export function TasksPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [deleteTask, setDeleteTask] = useState<Task | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  const filters: Record<string, string> = {}
  if (statusFilter !== 'all') filters.status = statusFilter
  if (priorityFilter !== 'all') filters.priority = priorityFilter

  const { data, isLoading } = useTasks(projectId!, Object.keys(filters).length > 0 ? filters : undefined)
  const { data: wbsTree } = useWBSTree(projectId!)
  const createTask = useCreateTask(projectId!)
  const updateTask = useUpdateTask(projectId!)
  const deleteTaskMutation = useDeleteTask(projectId!)

  const allTasks = data?.items || []
  const wbsItems = flattenWBS(wbsTree?.items || [])

  // Apply search filter on client side
  const tasks = useMemo(() => {
    if (!searchQuery.trim()) return allTasks
    const q = searchQuery.toLowerCase()
    return allTasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.tags?.some((tag) => tag.toLowerCase().includes(q))
    )
  }, [allTasks, searchQuery])

  // Group tasks for board view
  const tasksByStatus = useMemo(() => {
    const groups: Record<string, Task[]> = {}
    for (const s of TASK_STATUSES) {
      groups[s] = tasks.filter((t) => t.status === s)
    }
    return groups
  }, [tasks])

  // Stats
  const stats = useMemo(() => {
    const total = allTasks.length
    const done = allTasks.filter((t) => t.status === 'done').length
    const blocked = allTasks.filter((t) => t.status === 'blocked').length
    const avgCompletion = total > 0 ? Math.round(allTasks.reduce((sum, t) => sum + (t.completion_pct || 0), 0) / total) : 0
    return { total, done, blocked, avgCompletion }
  }, [allTasks])

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<TaskForm>({
    resolver: zodResolver(taskSchema),
    defaultValues: { status: 'todo', priority: 'medium' },
  })

  function openCreateDialog() {
    reset({
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
      due_date: '',
      start_date: '',
      estimated_hours: '' as any,
      tags: '',
      wbs_item_id: '',
      parent_task_id: '',
    })
    setEditingTask(null)
    setDialogOpen(true)
  }

  function openEditDialog(task: Task) {
    setEditingTask(task)
    reset({
      title: task.title,
      description: task.description ?? '',
      status: task.status,
      priority: task.priority,
      due_date: task.due_date ?? '',
      start_date: task.start_date ?? '',
      estimated_hours: task.estimated_hours ?? ('' as any),
      tags: (task.tags || []).join(', '),
      wbs_item_id: task.wbs_item_id ?? '',
      parent_task_id: task.parent_task_id ?? '',
    })
    setDialogOpen(true)
  }

  function onSubmit(data: TaskForm) {
    const payload: Record<string, unknown> = {
      title: data.title,
      description: data.description || null,
      status: data.status,
      priority: data.priority,
      start_date: data.start_date || null,
      due_date: data.due_date || null,
      estimated_hours: data.estimated_hours === '' ? null : Number(data.estimated_hours),
      wbs_item_id: data.wbs_item_id || null,
      parent_task_id: data.parent_task_id || null,
      tags: data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    }

    if (editingTask) {
      updateTask.mutate(
        { id: editingTask.id, data: payload as any },
        {
          onSuccess: () => {
            reset()
            setEditingTask(null)
            setDialogOpen(false)
          },
        }
      )
    } else {
      createTask.mutate(payload as any, {
        onSuccess: () => {
          reset()
          setDialogOpen(false)
        },
      })
    }
  }

  function handleStatusChange(taskId: string, status: string) {
    updateTask.mutate({ id: taskId, data: { status } as any })
  }

  function confirmDeleteTask() {
    if (!deleteTask) return
    deleteTaskMutation.mutate(deleteTask.id, {
      onSuccess: () => setDeleteTask(null),
    })
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Total Tasks" value={stats.total} icon={<Layers className="h-4 w-4" />} />
          <StatCard label="Completed" value={stats.done} icon={<BarChart3 className="h-4 w-4" />} color="text-emerald-600" />
          <StatCard label="Blocked" value={stats.blocked} icon={<GitBranch className="h-4 w-4" />} color="text-red-600" />
          <StatCard label="Avg Progress" value={`${stats.avgCompletion}%`} icon={<BarChart3 className="h-4 w-4" />} color="text-blue-600" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Tasks</h2>
            <p className="text-sm text-muted-foreground">
              {tasks.length} task{tasks.length !== 1 ? 's' : ''} shown
              {searchQuery && ` matching "${searchQuery}"`}
            </p>
          </div>
          <Button onClick={openCreateDialog} id="create-task-btn">
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              id="task-search"
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]" id="status-filter">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {TASK_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{TASK_STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Priority Filter */}
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[150px]" id="priority-filter">
              <ArrowUpDown className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              {TASK_PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>{TASK_PRIORITY_LABELS[p]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* View Toggle */}
          <div className="ml-auto flex items-center rounded-md border bg-muted/30 p-0.5">
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('list')}
              id="list-view-btn"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'board' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('board')}
              id="board-view-btn"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Task List View */}
        {viewMode === 'list' && (
          <div className="space-y-2">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-[76px] w-full rounded-lg" />
                ))
              : tasks.map((task) => (
                  <TaskListItem
                    key={task.id}
                    task={task}
                    wbsItems={wbsItems}
                    onStatusChange={handleStatusChange}
                    onEdit={openEditDialog}
                    onDelete={setDeleteTask}
                    onSelect={() => setSelectedTaskId(task.id)}
                  />
                ))}
            {!isLoading && tasks.length === 0 && (
              <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-dashed text-muted-foreground">
                <Layers className="mb-2 h-8 w-8 opacity-50" />
                <p className="font-medium">No tasks found</p>
                <p className="text-sm">Create a task to get started.</p>
              </div>
            )}
          </div>
        )}

        {/* Board View */}
        {viewMode === 'board' && (
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
            {TASK_STATUSES.filter((s) => s !== 'cancelled').map((status) => (
              <div key={status} className="min-w-[280px] flex-shrink-0 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn('rounded-md border px-2 py-0.5 text-xs font-medium', TASK_STATUS_COLORS[status])}>
                      {TASK_STATUS_LABELS[status]}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {tasksByStatus[status]?.length || 0}
                    </span>
                  </div>
                </div>
                <div className="space-y-2 rounded-lg bg-muted/30 p-2 min-h-[200px]">
                  {(tasksByStatus[status] || []).map((task) => (
                    <BoardCard
                      key={task.id}
                      task={task}
                      onClick={() => setSelectedTaskId(task.id)}
                    />
                  ))}
                  {(tasksByStatus[status] || []).length === 0 && (
                    <div className="flex h-24 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
                      No tasks
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create / Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{editingTask ? 'Edit Task' : 'Create Task'}</DialogTitle>
              <DialogDescription>
                {editingTask ? 'Update the task details.' : 'Add a new task to the project.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="task-title">Title</Label>
                <Input id="task-title" placeholder="Task title" {...register('title')} />
                {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="task-desc">Description</Label>
                <Textarea id="task-desc" placeholder="Describe the task..." rows={3} {...register('description')} />
              </div>

              {/* Status & Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    onValueChange={(v) => setValue('status', v)}
                    defaultValue={editingTask?.status ?? 'todo'}
                    key={editingTask?.id ?? 'new-status'}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TASK_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{TASK_STATUS_LABELS[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    onValueChange={(v) => setValue('priority', v)}
                    defaultValue={editingTask?.priority ?? 'medium'}
                    key={editingTask?.id ? `${editingTask.id}-priority` : 'new-priority'}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TASK_PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p}>{TASK_PRIORITY_LABELS[p]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="task-start">Start Date</Label>
                  <Input id="task-start" type="date" {...register('start_date')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task-due">Due Date</Label>
                  <Input id="task-due" type="date" {...register('due_date')} />
                </div>
              </div>

              {/* Estimated Hours & WBS Item */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="task-hours">Estimated Hours</Label>
                  <Input id="task-hours" type="number" min="0" step="0.5" placeholder="0" {...register('estimated_hours')} />
                </div>
                <div className="space-y-2">
                  <Label>WBS Item</Label>
                  <Select
                    onValueChange={(v) => setValue('wbs_item_id', v === 'none' ? '' : v)}
                    defaultValue={editingTask?.wbs_item_id ?? 'none'}
                    key={editingTask?.id ? `${editingTask.id}-wbs` : 'new-wbs'}
                  >
                    <SelectTrigger><SelectValue placeholder="Select WBS item" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {wbsItems.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          <span className="flex items-center gap-1">
                            <span className="font-mono text-xs text-muted-foreground">{item.code}</span>
                            {item.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Parent Task */}
              <div className="space-y-2">
                <Label>Parent Task (subtask of)</Label>
                <Select
                  onValueChange={(v) => setValue('parent_task_id', v === 'none' ? '' : v)}
                  defaultValue={editingTask?.parent_task_id ?? 'none'}
                  key={editingTask?.id ? `${editingTask.id}-parent` : 'new-parent'}
                >
                  <SelectTrigger><SelectValue placeholder="No parent (top-level)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (top-level task)</SelectItem>
                    {allTasks
                      .filter((t) => t.id !== editingTask?.id)
                      .map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label htmlFor="task-tags">Tags (comma separated)</Label>
                <Input id="task-tags" placeholder="e.g. frontend, urgent, spike" {...register('tags')} />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createTask.isPending || updateTask.isPending}>
                  {editingTask ? 'Save Changes' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={deleteTask !== null}
          onOpenChange={(open) => { if (!open) setDeleteTask(null) }}
          title="Delete Task"
          description={`Are you sure you want to delete "${deleteTask?.title}"? This action cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={confirmDeleteTask}
          isPending={deleteTaskMutation.isPending}
        />

        {/* Task Detail Panel */}
        {selectedTaskId && (
          <TaskDetailPanel
            taskId={selectedTaskId}
            projectId={projectId!}
            onClose={() => setSelectedTaskId(null)}
            onNavigateToTask={(id) => setSelectedTaskId(id)}
          />
        )}
      </div>
    </TooltipProvider>
  )
}

// -- Sub-components --

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color?: string }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={cn('text-2xl font-bold', color)}>{value}</p>
        </div>
        <div className="rounded-lg bg-muted p-2.5 text-muted-foreground">{icon}</div>
      </CardContent>
    </Card>
  )
}

function TaskListItem({
  task,
  wbsItems,
  onStatusChange,
  onEdit,
  onDelete,
  onSelect,
}: {
  task: Task
  wbsItems: WBSItem[]
  onStatusChange: (taskId: string, status: string) => void
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
  onSelect: () => void
}) {
  const wbsItem = wbsItems.find((w) => w.id === task.wbs_item_id)

  return (
    <Card
      className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/30"
      onClick={onSelect}
      id={`task-${task.id}`}
    >
      <CardContent className="flex items-center gap-4 p-4">
        {/* Status dropdown - stop propagation */}
        <div onClick={(e) => e.stopPropagation()}>
          <Select value={task.status} onValueChange={(v) => onStatusChange(task.id, v)}>
            <SelectTrigger className={cn('w-[130px] text-xs border', TASK_STATUS_COLORS[task.status])}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{TASK_STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Title & description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{task.title}</p>
            {task.parent_task_id && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex-shrink-0">
                subtask
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            {task.description && (
              <p className="text-sm text-muted-foreground line-clamp-1 max-w-xs">{task.description}</p>
            )}
            {wbsItem && (
              <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
                {wbsItem.code}
              </span>
            )}
          </div>
        </div>

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <div className="hidden lg:flex items-center gap-1">
            {task.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px]">
                {tag}
              </Badge>
            ))}
            {task.tags.length > 2 && (
              <span className="text-[10px] text-muted-foreground">+{task.tags.length - 2}</span>
            )}
          </div>
        )}

        {/* Progress */}
        {task.completion_pct > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="hidden md:flex items-center gap-2 w-20">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      task.completion_pct >= 100 ? 'bg-emerald-500' : task.completion_pct >= 50 ? 'bg-primary' : 'bg-amber-500'
                    )}
                    style={{ width: `${Math.min(task.completion_pct, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{task.completion_pct}%</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>Completion: {task.completion_pct}%</TooltipContent>
          </Tooltip>
        )}

        {/* Priority */}
        <PriorityBadge priority={task.priority} />

        {/* Date info */}
        {task.due_date && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {formatDate(task.due_date, 'MMM d')}
              </span>
            </TooltipTrigger>
            <TooltipContent>Due: {formatDate(task.due_date)}</TooltipContent>
          </Tooltip>
        )}

        {/* Hours */}
        {task.estimated_hours != null && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {task.estimated_hours}h
              </span>
            </TooltipTrigger>
            <TooltipContent>
              Estimated: {task.estimated_hours}h
              {task.actual_hours != null && ` / Actual: ${task.actual_hours}h`}
            </TooltipContent>
          </Tooltip>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onEdit(task)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onDelete(task)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </CardContent>
    </Card>
  )
}

function BoardCard({ task, onClick }: { task: Task; onClick: () => void }) {
  return (
    <div
      className="cursor-pointer rounded-lg border bg-background p-3 shadow-sm transition-all hover:shadow-md hover:border-primary/30"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-tight">{task.title}</p>
        <PriorityBadge priority={task.priority} />
      </div>

      {task.description && (
        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{task.description}</p>
      )}

      <div className="mt-3 flex items-center gap-2 flex-wrap">
        {task.tags && task.tags.slice(0, 2).map((tag) => (
          <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
            {tag}
          </Badge>
        ))}
      </div>

      {/* Bottom row */}
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          {task.due_date && (
            <span className="flex items-center gap-0.5">
              <Calendar className="h-3 w-3" />
              {formatDate(task.due_date, 'MMM d')}
            </span>
          )}
          {task.estimated_hours != null && (
            <span className="flex items-center gap-0.5">
              <Clock className="h-3 w-3" />
              {task.estimated_hours}h
            </span>
          )}
        </div>
        {task.completion_pct > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-12 h-1 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full',
                  task.completion_pct >= 100 ? 'bg-emerald-500' : 'bg-primary'
                )}
                style={{ width: `${Math.min(task.completion_pct, 100)}%` }}
              />
            </div>
            <span>{task.completion_pct}%</span>
          </div>
        )}
      </div>
    </div>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={cn('inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium flex-shrink-0', TASK_PRIORITY_COLORS[priority])}>
      {TASK_PRIORITY_LABELS[priority] || priority}
    </span>
  )
}

// Helper: flatten nested WBS items for select dropdown
function flattenWBS(items: WBSItem[]): WBSItem[] {
  const result: WBSItem[] = []
  function recurse(list: WBSItem[]) {
    for (const item of list) {
      result.push(item)
      if (item.children && item.children.length > 0) {
        recurse(item.children)
      }
    }
  }
  recurse(items)
  return result
}
