import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  useTask,
  useUpdateTask,
  useTaskPredecessors,
  useTaskSuccessors,
  useAddDependency,
  useDeleteDependency,
  useTasks,
} from '@/hooks/useTasks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  TASK_STATUSES,
  TASK_PRIORITIES,
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_COLORS,
  TASK_PRIORITY_COLORS,
  DEPENDENCY_TYPES,
  DEPENDENCY_TYPE_LABELS,
} from '@/lib/constants'
import { formatDate, cn } from '@/lib/utils'
import {
  X,
  Save,
  ArrowRight,
  ArrowLeft,
  Link2,
  Unlink,
  Clock,
  Calendar,
  Tag,
  BarChart3,
  GitBranch,
  Plus,
  Trash2,
  ChevronRight,
  AlertCircle,
} from 'lucide-react'
import type { Task, TaskDependency } from '@/types'

interface TaskDetailPanelProps {
  taskId: string
  projectId: string
  onClose: () => void
  onNavigateToTask: (taskId: string) => void
}

const editSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status: z.string(),
  priority: z.string(),
  start_date: z.string().optional(),
  due_date: z.string().optional(),
  estimated_hours: z.union([z.coerce.number().min(0), z.literal('')]).optional(),
  actual_hours: z.union([z.coerce.number().min(0), z.literal('')]).optional(),
  completion_pct: z.coerce.number().min(0).max(100).optional(),
  tags: z.string().optional(),
})

type EditForm = z.infer<typeof editSchema>

export function TaskDetailPanel({ taskId, projectId, onClose, onNavigateToTask }: TaskDetailPanelProps) {
  const { data: task, isLoading } = useTask(taskId)
  const { data: predecessors } = useTaskPredecessors(taskId)
  const { data: successors } = useTaskSuccessors(taskId)
  const { data: allTasksData } = useTasks(projectId, { limit: '100' } as any)
  const updateTask = useUpdateTask(projectId)
  const addDependency = useAddDependency(taskId)
  const deleteDependency = useDeleteDependency(taskId)

  const [isEditing, setIsEditing] = useState(false)
  const [addDepOpen, setAddDepOpen] = useState(false)
  const [removeDepId, setRemoveDepId] = useState<string | null>(null)
  const [newDepTaskId, setNewDepTaskId] = useState('')
  const [newDepType, setNewDepType] = useState('finish_to_start')
  const [newDepLag, setNewDepLag] = useState(0)

  const allTasks = allTasksData?.items || []

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
  })

  function startEditing() {
    if (!task) return
    reset({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      start_date: task.start_date || '',
      due_date: task.due_date || '',
      estimated_hours: task.estimated_hours ?? ('' as any),
      actual_hours: task.actual_hours ?? ('' as any),
      completion_pct: task.completion_pct ?? 0,
      tags: (task.tags || []).join(', '),
    })
    setIsEditing(true)
  }

  function onSubmit(data: EditForm) {
    const payload: Record<string, unknown> = {
      title: data.title,
      description: data.description || null,
      status: data.status,
      priority: data.priority,
      start_date: data.start_date || null,
      due_date: data.due_date || null,
      estimated_hours: data.estimated_hours === '' ? null : Number(data.estimated_hours),
      actual_hours: data.actual_hours === '' ? null : Number(data.actual_hours),
      completion_pct: Number(data.completion_pct) || 0,
      tags: data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    }

    updateTask.mutate(
      { id: taskId, data: payload as any },
      {
        onSuccess: () => {
          setIsEditing(false)
        },
      }
    )
  }

  function handleAddDependency() {
    if (!newDepTaskId) return
    addDependency.mutate(
      { predecessor_id: newDepTaskId, type: newDepType, lag_days: newDepLag },
      {
        onSuccess: () => {
          setAddDepOpen(false)
          setNewDepTaskId('')
          setNewDepType('finish_to_start')
          setNewDepLag(0)
        },
      }
    )
  }

  function confirmRemoveDependency() {
    if (!removeDepId) return
    deleteDependency.mutate(removeDepId, {
      onSuccess: () => setRemoveDepId(null),
    })
  }

  // Filter tasks that can be predecessors (exclude self and existing predecessors)
  const existingPredecessorIds = new Set((predecessors || []).map((d) => d.predecessor_id))
  const availablePredecessors = allTasks.filter(
    (t) => t.id !== taskId && !existingPredecessorIds.has(t.id)
  )

  if (isLoading || !task) {
    return (
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg border-l bg-background shadow-2xl animate-in slide-in-from-right-full duration-300">
        <div className="flex h-full items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l bg-background shadow-2xl animate-in slide-in-from-right-full duration-300">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn('rounded-md border px-2.5 py-0.5 text-xs font-medium', TASK_STATUS_COLORS[task.status])}>
            {TASK_STATUS_LABELS[task.status]}
          </div>
          <div className={cn('rounded-md px-2.5 py-0.5 text-xs font-medium', TASK_PRIORITY_COLORS[task.priority])}>
            {TASK_PRIORITY_LABELS[task.priority]}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <Button variant="outline" size="sm" onClick={startEditing}>
              Edit
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={handleSubmit(onSubmit)}
              disabled={updateTask.isPending || !isDirty}
            >
              <Save className="mr-1.5 h-3.5 w-3.5" />
              Save
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <Tabs defaultValue="details" className="w-full">
          <div className="border-b px-6 pt-4">
            <TabsList className="w-full">
              <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
              <TabsTrigger value="dependencies" className="flex-1">
                Dependencies
                {((predecessors?.length || 0) + (successors?.length || 0)) > 0 && (
                  <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {(predecessors?.length || 0) + (successors?.length || 0)}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Details Tab */}
          <TabsContent value="details" className="px-6 py-4 space-y-6">
            {isEditing ? (
              <form className="space-y-5">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="detail-title">Title</Label>
                  <Input id="detail-title" {...register('title')} />
                  {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="detail-desc">Description</Label>
                  <Textarea id="detail-desc" rows={4} {...register('description')} />
                </div>

                {/* Status & Priority */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      defaultValue={task.status}
                      onValueChange={(v) => setValue('status', v, { shouldDirty: true })}
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
                      defaultValue={task.priority}
                      onValueChange={(v) => setValue('priority', v, { shouldDirty: true })}
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
                    <Label htmlFor="detail-start">Start Date</Label>
                    <Input id="detail-start" type="date" {...register('start_date')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="detail-due">Due Date</Label>
                    <Input id="detail-due" type="date" {...register('due_date')} />
                  </div>
                </div>

                {/* Hours */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="detail-est">Estimated Hours</Label>
                    <Input id="detail-est" type="number" min="0" step="0.5" {...register('estimated_hours')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="detail-act">Actual Hours</Label>
                    <Input id="detail-act" type="number" min="0" step="0.5" {...register('actual_hours')} />
                  </div>
                </div>

                {/* Completion */}
                <div className="space-y-2">
                  <Label htmlFor="detail-pct">Completion %</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="detail-pct"
                      type="number"
                      min="0"
                      max="100"
                      className="w-24"
                      {...register('completion_pct')}
                    />
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${task.completion_pct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <Label htmlFor="detail-tags">Tags (comma separated)</Label>
                  <Input id="detail-tags" placeholder="e.g. frontend, urgent, spike" {...register('tags')} />
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                {/* Title */}
                <div>
                  <h3 className="text-lg font-semibold leading-tight">{task.title}</h3>
                  {task.description && (
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{task.description}</p>
                  )}
                </div>

                <Separator />

                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <BarChart3 className="h-4 w-4" />
                      Progress
                    </span>
                    <span className="font-medium">{task.completion_pct}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        task.completion_pct >= 100
                          ? 'bg-emerald-500'
                          : task.completion_pct >= 50
                          ? 'bg-primary'
                          : 'bg-amber-500'
                      )}
                      style={{ width: `${Math.min(task.completion_pct, 100)}%` }}
                    />
                  </div>
                </div>

                <Separator />

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      Start Date
                    </span>
                    <p className="text-sm font-medium">{task.start_date ? formatDate(task.start_date) : '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      Due Date
                    </span>
                    <p className="text-sm font-medium">{task.due_date ? formatDate(task.due_date) : '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      Estimated Hours
                    </span>
                    <p className="text-sm font-medium">{task.estimated_hours != null ? `${task.estimated_hours}h` : '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      Actual Hours
                    </span>
                    <p className="text-sm font-medium">{task.actual_hours != null ? `${task.actual_hours}h` : '—'}</p>
                  </div>
                </div>

                {task.completed_date && (
                  <div className="space-y-1">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      Completed
                    </span>
                    <p className="text-sm font-medium">{formatDate(task.completed_date)}</p>
                  </div>
                )}

                {/* Tags */}
                {task.tags && task.tags.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Tag className="h-3.5 w-3.5" />
                        Tags
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {task.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                  <div>
                    <span className="font-medium">Created</span>
                    <p>{formatDate(task.created_at)}</p>
                  </div>
                  <div>
                    <span className="font-medium">Updated</span>
                    <p>{formatDate(task.updated_at)}</p>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Dependencies Tab */}
          <TabsContent value="dependencies" className="px-6 py-4 space-y-6">
            {/* Predecessors */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="flex items-center gap-2 text-sm font-semibold">
                  <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                  Predecessors
                  {predecessors && predecessors.length > 0 && (
                    <span className="text-xs font-normal text-muted-foreground">({predecessors.length})</span>
                  )}
                </h4>
                <Button variant="outline" size="sm" onClick={() => setAddDepOpen(true)}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add
                </Button>
              </div>

              {!predecessors || predecessors.length === 0 ? (
                <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  <Link2 className="h-4 w-4" />
                  No predecessor dependencies
                </div>
              ) : (
                <div className="space-y-2">
                  {predecessors.map((dep) => (
                    <DependencyCard
                      key={dep.id}
                      dep={dep}
                      taskId={dep.predecessor_id}
                      allTasks={allTasks}
                      direction="predecessor"
                      onNavigate={onNavigateToTask}
                      onRemove={() => setRemoveDepId(dep.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Successors */}
            <div className="space-y-3">
              <h4 className="flex items-center gap-2 text-sm font-semibold">
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                Successors
                {successors && successors.length > 0 && (
                  <span className="text-xs font-normal text-muted-foreground">({successors.length})</span>
                )}
              </h4>

              {!successors || successors.length === 0 ? (
                <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  <Link2 className="h-4 w-4" />
                  No successor dependencies
                </div>
              ) : (
                <div className="space-y-2">
                  {successors.map((dep) => (
                    <DependencyCard
                      key={dep.id}
                      dep={dep}
                      taskId={dep.successor_id}
                      allTasks={allTasks}
                      direction="successor"
                      onNavigate={onNavigateToTask}
                      onRemove={() => setRemoveDepId(dep.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Dependency Legend */}
            <Separator />
            <div className="space-y-2">
              <h4 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <GitBranch className="h-3.5 w-3.5" />
                Dependency Types
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  FS — Finish to Start
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  SS — Start to Start
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  FF — Finish to Finish
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-purple-500" />
                  SF — Start to Finish
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Dependency Dialog */}
      {addDepOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={() => setAddDepOpen(false)}>
          <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-1 text-lg font-semibold">Add Predecessor</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Select a task that must be completed before this task.
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Predecessor Task</Label>
                <Select value={newDepTaskId} onValueChange={setNewDepTaskId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a task..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {availablePredecessors.length === 0 ? (
                      <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                        <AlertCircle className="h-4 w-4" />
                        No available tasks
                      </div>
                    ) : (
                      availablePredecessors.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          <span className="flex items-center gap-2">
                            <span className={cn('h-2 w-2 rounded-full', {
                              'bg-slate-400': t.status === 'todo',
                              'bg-blue-500': t.status === 'in_progress',
                              'bg-purple-500': t.status === 'in_review',
                              'bg-emerald-500': t.status === 'done',
                              'bg-red-500': t.status === 'blocked',
                              'bg-gray-400': t.status === 'cancelled',
                            })} />
                            {t.title}
                          </span>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={newDepType} onValueChange={setNewDepType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPENDENCY_TYPES.map((dt) => (
                        <SelectItem key={dt} value={dt}>
                          {DEPENDENCY_TYPE_LABELS[dt]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dep-lag">Lag (days)</Label>
                  <Input
                    id="dep-lag"
                    type="number"
                    min="0"
                    value={newDepLag}
                    onChange={(e) => setNewDepLag(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setAddDepOpen(false)}>Cancel</Button>
                <Button onClick={handleAddDependency} disabled={!newDepTaskId || addDependency.isPending}>
                  <Link2 className="mr-1.5 h-3.5 w-3.5" />
                  Add Dependency
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Remove Dependency Confirm */}
      <ConfirmDialog
        open={removeDepId !== null}
        onOpenChange={(open) => { if (!open) setRemoveDepId(null) }}
        title="Remove Dependency"
        description="Are you sure you want to remove this dependency? This may affect your project schedule."
        confirmLabel="Remove"
        onConfirm={confirmRemoveDependency}
        isPending={deleteDependency.isPending}
      />
    </div>
  )
}

// Dependency card sub-component
function DependencyCard({
  dep,
  taskId,
  allTasks,
  direction,
  onNavigate,
  onRemove,
}: {
  dep: TaskDependency
  taskId: string
  allTasks: Task[]
  direction: 'predecessor' | 'successor'
  onNavigate: (id: string) => void
  onRemove: () => void
}) {
  const linkedTask = allTasks.find((t) => t.id === taskId)
  const typeColors: Record<string, string> = {
    finish_to_start: 'bg-blue-500',
    start_to_start: 'bg-emerald-500',
    finish_to_finish: 'bg-amber-500',
    start_to_finish: 'bg-purple-500',
  }

  return (
    <div className="group flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
      <div className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0', typeColors[dep.type] || 'bg-gray-400')} />
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => onNavigate(taskId)}
      >
        <p className="truncate text-sm font-medium group-hover:text-primary transition-colors">
          {linkedTask?.title || 'Unknown task'}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{DEPENDENCY_TYPE_LABELS[dep.type] || dep.type}</span>
          {dep.lag_days > 0 && (
            <span className="rounded bg-muted px-1.5 py-0.5">+{dep.lag_days}d lag</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onNavigate(taskId)}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onRemove}
        >
          <Unlink className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
