import { Link, useLocation, useParams } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useProjectStore } from '@/stores/projectStore'
import { MAIN_NAV, PROJECT_NAV, ROUTES } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'

export function Sidebar() {
  const location = useLocation()
  const params = useParams()
  const projectId = params.projectId
  const { currentProject, sidebarCollapsed, toggleSidebar } = useProjectStore()

  const isProjectRoute = location.pathname.startsWith('/projects/') && projectId

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r bg-background transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-16 items-center justify-between border-b px-4">
        {!sidebarCollapsed && (
          <Link to={ROUTES.home} className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">PM AI</span>
          </Link>
        )}
        {sidebarCollapsed && (
          <Link to={ROUTES.home} className="mx-auto">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
          </Link>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {MAIN_NAV.map((item) => {
          const isActive = item.href === ROUTES.home
            ? location.pathname === ROUTES.home
            : location.pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground',
                sidebarCollapsed && 'justify-center px-2'
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </Link>
          )
        })}

        {isProjectRoute && currentProject && (
          <>
            <div className={cn('my-4 border-t', sidebarCollapsed && 'mx-2')} />
            {!sidebarCollapsed && (
              <div className="px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {currentProject.name}
                </p>
              </div>
            )}
            {PROJECT_NAV.map((item) => {
              const to = `/projects/${projectId}/${item.href}`
              const isActive = location.pathname === to || location.pathname.endsWith(`/${item.href}`)
              return (
                <Link
                  key={item.href}
                  to={to}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground',
                    sidebarCollapsed && 'justify-center px-2'
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="w-full"
        >
          {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
    </aside>
  )
}
