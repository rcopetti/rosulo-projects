import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject } from '@/hooks/useProjects'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDate } from '@/lib/utils'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import type { Project } from '@/types'

const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().default(''),
  methodology: z.enum(['waterfall', 'agile', 'hybrid', 'prince2', 'custom']),
  status: z.enum(['draft', 'active', 'on_hold', 'completed', 'archived']),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
})

type ProjectForm = z.infer<typeof projectSchema>

export function ProjectsPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [deleteProject, setDeleteProject] = useState<Project | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const activeOrgId = useAuthStore((s) => s.activeOrgId)
  const { data, isLoading } = useProjects()
  const createProject = useCreateProject()
  const updateProject = useUpdateProject()
  const deleteProjectMutation = useDeleteProject()

  const projects = data || []

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ProjectForm>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      methodology: 'agile',
      status: 'draft',
    },
  })

  function openCreateDialog() {
    setEditingProject(null)
    reset({ name: '', description: '', methodology: 'agile', status: 'draft', start_date: '', end_date: '' })
    setDialogOpen(true)
  }

  function openEditDialog(project: Project) {
    setEditingProject(project)
    reset({
      name: project.name,
      description: project.description || '',
      methodology: project.methodology,
      status: project.status,
      start_date: project.start_date || '',
      end_date: project.end_date || '',
    })
    setDialogOpen(true)
  }

  function onSubmit(data: ProjectForm) {
    if (editingProject) {
      updateProject.mutate({ id: editingProject.id, data }, {
        onSuccess: () => {
          reset()
          setEditingProject(null)
          setDialogOpen(false)
        },
      })
    } else {
      createProject.mutate(data, {
        onSuccess: () => {
          reset()
          setDialogOpen(false)
        },
      })
    }
  }

  function handleDelete() {
    if (!deleteProject) return
    setDeleteError(null)
    deleteProjectMutation.mutate(deleteProject.id, {
      onSuccess: () => {
        setDeleteProject(null)
      },
      onError: (error: any) => {
        if (error?.response?.status === 409) {
          setDeleteError('Cannot delete project: it has tasks or WBS items. Remove them first.')
        } else {
          setDeleteError('Failed to delete project. Please try again.')
        }
      },
    })
  }

  const isPending = editingProject ? updateProject.isPending : createProject.isPending

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">Manage your projects and track progress.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingProject ? 'Edit Project' : 'Create Project'}</DialogTitle>
              <DialogDescription>
                {editingProject ? 'Update the project details.' : 'Add a new project to your workspace.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" placeholder="Project name" {...register('name')} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" placeholder="Describe the project" {...register('description')} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Methodology</Label>
                  <Select onValueChange={(v) => setValue('methodology', v as any)} defaultValue="agile">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="waterfall">Waterfall</SelectItem>
                      <SelectItem value="agile">Agile</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select onValueChange={(v) => setValue('status', v as any)} defaultValue="draft">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input id="start_date" type="date" {...register('start_date')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input id="end_date" type="date" {...register('end_date')} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {editingProject ? 'Save Changes' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Methodology</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              : projects.map((project) => (
                  <TableRow key={project.id} className="cursor-pointer">
                    <TableCell>
                      <Link to={`/projects/${project.id}`} className="font-medium hover:underline">
                        {project.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={project.status} />
                    </TableCell>
                    <TableCell className="capitalize">{project.methodology}</TableCell>
                    <TableCell>{project.start_date ? formatDate(project.start_date) : '—'}</TableCell>
                    <TableCell>{project.end_date ? formatDate(project.end_date) : '—'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(project)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { setDeleteError(null); setDeleteProject(project) }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={!!deleteProject}
        onOpenChange={(open) => { if (!open) { setDeleteProject(null); setDeleteError(null) } }}
        title="Delete Project"
        description={
          deleteError ||
          `Are you sure you want to delete "${deleteProject?.name}"? This action cannot be undone.`
        }
        confirmLabel="Delete"
        onConfirm={handleDelete}
        isPending={deleteProjectMutation.isPending}
        variant="destructive"
      />
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline'; label: string }> = {
    draft: { variant: 'secondary', label: 'Draft' },
    active: { variant: 'success', label: 'Active' },
    on_hold: { variant: 'warning', label: 'On Hold' },
    completed: { variant: 'outline', label: 'Completed' },
    archived: { variant: 'outline', label: 'Archived' },
  }
  const config = map[status] || { variant: 'default' as const, label: status }
  return <Badge variant={config.variant}>{config.label}</Badge>
}
