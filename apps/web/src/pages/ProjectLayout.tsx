import { useEffect } from 'react'
import { Outlet, useParams, useLocation, Link } from 'react-router-dom'
import { useProject } from '@/hooks/useProjects'
import { useProjectStore } from '@/stores/projectStore'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'

const PROJECT_TABS = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'wbs', label: 'WBS' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'schedule', label: 'Schedule' },
  { value: 'risks', label: 'Risks' },
  { value: 'copilot', label: 'Copilot' },
]

export function ProjectLayout() {
  const { projectId } = useParams<{ projectId: string }>()
  const location = useLocation()
  const { data: project, isLoading } = useProject(projectId!)
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject)

  useEffect(() => {
    if (project) {
      setCurrentProject(project)
    }
    return () => setCurrentProject(null)
  }, [project, setCurrentProject])

  const currentTab = location.pathname.split('/').pop() || 'dashboard'

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full max-w-lg" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
        <p className="text-muted-foreground">{project.description}</p>
      </div>

      <Tabs value={currentTab}>
        <TabsList>
          {PROJECT_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} asChild>
              <Link to={`/projects/${projectId}/${tab.value}`}>{tab.label}</Link>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Outlet />
    </div>
  )
}
