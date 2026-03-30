import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '@/hooks/useTasks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatDate } from '@/lib/utils'
import { TASK_STATUSES, TASK_PRIORITIES } from '@/lib/constants'
import { Plus, Filter, Pencil, Trash2 } from 'lucide-react'
import type { Task } from '@/types'

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().default(''),
  status: z.string().default('todo'),
  priority: z.string().default('medium'),
  due_date: z.string().optional(),
})

type TaskForm = z.infer<typeof taskSchema>

export function TasksPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [deleteTask, setDeleteTask] = useState<Task | null>(null)

  const filters = statusFilter !== 'all' ? { status: statusFilter } : undefined
  const { data, isLoading } = useTasks(projectId!, filters)
  const createTask = useCreateTask(projectId!)
  const updateTask = useUpdateTask(projectId!)
  const deleteTaskMutation = useDeleteTask(projectId!)

  const tasks = data?.items || []

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
    reset({ title: '', description: '', status: 'todo', priority: 'medium', due_date: '' })
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
    })
    setDialogOpen(true)
  }

  function onSubmit(data: TaskForm) {
    const payload = {
      ...data,
      due_date: data.due_date || undefined,
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Tasks</h2>
          <p className="text-sm text-muted-foreground">{tasks.length} tasks total</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {TASK_STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit Task' : 'Create Task'}</DialogTitle>
            <DialogDescription>
              {editingTask ? 'Update the task details.' : 'Add a new task to the project.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input placeholder="Task title" {...register('title')} />
              {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Task description" {...register('description')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select onValueChange={(v) => setValue('status', v)} defaultValue={editingTask?.status ?? 'todo'} key={editingTask?.id ?? 'new-status'}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TASK_STATUSES.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">
                        {s.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select onValueChange={(v) => setValue('priority', v)} defaultValue={editingTask?.priority ?? 'medium'} key={editingTask?.id ? `${editingTask.id}-priority` : 'new-priority'}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TASK_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="date" {...register('due_date')} />
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

      <div className="space-y-3">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))
          : tasks.map((task) => (
              <Card key={task.id} className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center gap-4 p-4">
                  <Select value={task.status} onValueChange={(v) => handleStatusChange(task.id, v)}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">
                          {s.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex-1">
                    <p className="font-medium">{task.title}</p>
                    {task.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">{task.description}</p>
                    )}
                  </div>

                  <PriorityBadge priority={task.priority} />

                  {task.due_date && (
                    <span className="text-sm text-muted-foreground">{formatDate(task.due_date)}</span>
                  )}

                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(task)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTask(task)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
        {!isLoading && tasks.length === 0 && (
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
            <p>No tasks found. Create one to get started.</p>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteTask !== null}
        onOpenChange={(open) => { if (!open) setDeleteTask(null) }}
        title="Delete Task"
        description={`Are you sure you want to delete "${deleteTask?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={confirmDeleteTask}
        isPending={deleteTaskMutation.isPending}
      />
    </div>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'warning' | 'success'; label: string }> = {
    low: { variant: 'secondary', label: 'Low' },
    medium: { variant: 'default', label: 'Medium' },
    high: { variant: 'warning', label: 'High' },
    critical: { variant: 'destructive', label: 'Critical' },
  }
  const config = map[priority] || { variant: 'default' as const, label: priority }
  return <Badge variant={config.variant}>{config.label}</Badge>
}
