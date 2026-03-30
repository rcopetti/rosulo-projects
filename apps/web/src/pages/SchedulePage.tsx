import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useMilestones, useCreateMilestone, useUpdateMilestone, useDeleteMilestone } from '@/hooks/useMilestones'
import { formatDate } from '@/lib/utils'
import { Pencil, Trash2, Plus, Flag, CalendarDays, CheckCircle2 } from 'lucide-react'
import type { Milestone } from '@/types'

const milestoneSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  target_date: z.string().min(1, 'Target date is required'),
})

type MilestoneFormData = z.infer<typeof milestoneSchema>

const statusConfig = {
  pending: { variant: 'secondary' as const, icon: Flag, label: 'Pending' },
  achieved: { variant: 'success' as const, icon: CheckCircle2, label: 'Achieved' },
  missed: { variant: 'destructive' as const, icon: Flag, label: 'Missed' },
}

function getMilestoneStatus(milestone: Milestone): 'pending' | 'achieved' | 'missed' {
  if (milestone.completed) return 'achieved'
  if (new Date(milestone.target_date) < new Date()) return 'missed'
  return 'pending'
}

export function SchedulePage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { data: milestones } = useMilestones(projectId!)
  const createMilestone = useCreateMilestone(projectId!)
  const updateMilestone = useUpdateMilestone(projectId!)
  const deleteMilestone = useDeleteMilestone(projectId!)

  const [createOpen, setCreateOpen] = useState(false)
  const [editMilestone, setEditMilestone] = useState<Milestone | null>(null)
  const [deleteMilestoneId, setDeleteMilestoneId] = useState<string | null>(null)

  const createForm = useForm<MilestoneFormData>({
    resolver: zodResolver(milestoneSchema),
    defaultValues: { name: '', description: '', target_date: '' },
  })

  const editForm = useForm<MilestoneFormData>({
    resolver: zodResolver(milestoneSchema),
  })

  function handleCreate(data: MilestoneFormData) {
    createMilestone.mutate(
      { name: data.name, description: data.description, target_date: data.target_date },
      {
        onSuccess: () => {
          createForm.reset()
          setCreateOpen(false)
        },
      }
    )
  }

  function handleEdit(data: MilestoneFormData) {
    if (!editMilestone) return
    updateMilestone.mutate(
      { id: editMilestone.id, data: { name: data.name, description: data.description, target_date: data.target_date } },
      {
        onSuccess: () => {
          setEditMilestone(null)
        },
      }
    )
  }

  function handleDelete() {
    if (!deleteMilestoneId) return
    deleteMilestone.mutate(deleteMilestoneId, {
      onSuccess: () => setDeleteMilestoneId(null),
    })
  }

  function openEdit(milestone: Milestone) {
    editForm.reset({
      name: milestone.name,
      description: milestone.description || '',
      target_date: milestone.target_date,
    })
    setEditMilestone(milestone)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Schedule</h2>
          <p className="text-sm text-muted-foreground">Project timeline and milestones</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Milestone
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Milestone</DialogTitle>
              <DialogDescription>Create a new project milestone.</DialogDescription>
            </DialogHeader>
            <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="create-name">Name</Label>
                <Input id="create-name" {...createForm.register('name')} placeholder="Milestone name" />
                {createForm.formState.errors.name && (
                  <p className="text-sm text-destructive">{createForm.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-description">Description</Label>
                <Textarea id="create-description" {...createForm.register('description')} placeholder="Optional description" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-target_date">Target Date</Label>
                <Input id="create-target_date" type="date" {...createForm.register('target_date')} />
                {createForm.formState.errors.target_date && (
                  <p className="text-sm text-destructive">{createForm.formState.errors.target_date.message}</p>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMilestone.isPending}>Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Flag className="h-4 w-4" />
                Milestones
              </CardTitle>
              <CardDescription>Key project milestones</CardDescription>
            </CardHeader>
            <CardContent>
              {!milestones || milestones.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                  <p>No milestones defined yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {milestones.map((milestone) => {
                    const status = getMilestoneStatus(milestone)
                    const config = statusConfig[status]
                    const StatusIcon = config.icon
                    return (
                      <div key={milestone.id} className="flex items-start gap-3 rounded-lg border p-3">
                        <StatusIcon className="mt-0.5 h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium">{milestone.name}</p>
                            <Badge variant={config.variant}>{config.label}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{formatDate(milestone.target_date)}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(milestone)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteMilestoneId(milestone.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="h-4 w-4" />
                Gantt Chart
              </CardTitle>
              <CardDescription>Visual project timeline</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex h-[400px] items-center justify-center rounded-lg border border-dashed text-muted-foreground">
                <div className="text-center">
                  <CalendarDays className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  <p className="font-medium">Gantt Chart</p>
                  <p className="text-sm">Timeline visualization will appear here</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Critical Path</CardTitle>
          <CardDescription>Automatically calculated critical path analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
            <p>Critical path analysis requires tasks with dependencies and durations</p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editMilestone} onOpenChange={(open) => !open && setEditMilestone(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Milestone</DialogTitle>
            <DialogDescription>Update milestone details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(handleEdit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input id="edit-name" {...editForm.register('name')} placeholder="Milestone name" />
              {editForm.formState.errors.name && (
                <p className="text-sm text-destructive">{editForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea id="edit-description" {...editForm.register('description')} placeholder="Optional description" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-target_date">Target Date</Label>
              <Input id="edit-target_date" type="date" {...editForm.register('target_date')} />
              {editForm.formState.errors.target_date && (
                <p className="text-sm text-destructive">{editForm.formState.errors.target_date.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditMilestone(null)}>Cancel</Button>
              <Button type="submit" disabled={updateMilestone.isPending}>Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteMilestoneId}
        onOpenChange={(open) => !open && setDeleteMilestoneId(null)}
        title="Delete Milestone"
        description="Are you sure you want to delete this milestone? This action cannot be undone."
        onConfirm={handleDelete}
        isPending={deleteMilestone.isPending}
      />
    </div>
  )
}
