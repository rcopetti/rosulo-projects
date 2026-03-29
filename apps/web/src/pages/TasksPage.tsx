import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTasks, useCreateTask, useUpdateTask } from '@/hooks/useTasks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatDate } from '@/lib/utils'
import { TASK_STATUSES, TASK_PRIORITIES } from '@/lib/constants'
import { Plus, Filter } from 'lucide-react'

const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().default(''),
  status: z.string().default('todo'),
  priority: z.string().default('medium'),
  due_date: z.string().optional(),
})

type CreateTaskForm = z.infer<typeof createTaskSchema>

export function TasksPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)

  const filters = statusFilter !== 'all' ? { status: statusFilter } : undefined
  const { data, isLoading } = useTasks(projectId!, filters)
  const createTask = useCreateTask(projectId!)
  const updateTask = useUpdateTask(projectId!)

  const tasks = data?.items || []

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreateTaskForm>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: { status: 'todo', priority: 'medium' },
  })

  function onSubmit(data: CreateTaskForm) {
    createTask.mutate(data as any, {
      onSuccess: () => {
        reset()
        setDialogOpen(false)
      },
    })
  }

  function handleStatusChange(taskId: string, status: string) {
    updateTask.mutate({ id: taskId, data: { status } as any })
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
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Task</DialogTitle>
                <DialogDescription>Add a new task to the project.</DialogDescription>
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
                    <Select onValueChange={(v) => setValue('status', v)} defaultValue="todo">
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
                    <Select onValueChange={(v) => setValue('priority', v)} defaultValue="medium">
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
                  <Button type="submit" disabled={createTask.isPending}>Create</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

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
                </CardContent>
              </Card>
            ))}
        {!isLoading && tasks.length === 0 && (
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
            <p>No tasks found. Create one to get started.</p>
          </div>
        )}
      </div>
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
