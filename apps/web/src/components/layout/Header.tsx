import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useProjectStore } from '@/stores/projectStore'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Bell, LogOut, Settings, User } from 'lucide-react'
import { getInitials } from '@/lib/utils'
import { ROUTES } from '@/lib/constants'

export function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()
  const { user, logout } = useAuthStore()
  const currentProject = useProjectStore((s) => s.currentProject)

  const breadcrumbs = getBreadcrumbs(location.pathname, params, currentProject?.name)

  function handleLogout() {
    logout()
    navigate(ROUTES.login)
  }

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <nav className="flex items-center gap-2 text-sm">
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-2">
            {i > 0 && <span className="text-muted-foreground">/</span>}
            {crumb.href ? (
              <a href={crumb.href} className="text-muted-foreground hover:text-foreground">
                {crumb.label}
              </a>
            ) : (
              <span className="font-medium text-foreground">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
            3
          </span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user?.avatar_url ?? undefined} alt={user?.name} />
                <AvatarFallback>{user ? getInitials(user.name) : 'U'}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.name}</p>
                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('#')}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('#')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

interface Breadcrumb {
  label: string
  href?: string
}

function getBreadcrumbs(pathname: string, params: Record<string, string | undefined>, projectName?: string): Breadcrumb[] {
  const crumbs: Breadcrumb[] = [{ label: 'Home', href: '/' }]

  if (pathname.startsWith('/projects') && params.projectId) {
    crumbs.push({ label: 'Projects', href: '/projects' })
    crumbs.push({ label: projectName || 'Project', href: `/projects/${params.projectId}` })

    const subPath = pathname.split(`/projects/${params.projectId}/`)[1]
    if (subPath && subPath !== 'dashboard') {
      const label = subPath.charAt(0).toUpperCase() + subPath.slice(1)
      crumbs.push({ label })
    }
  } else if (pathname === '/projects') {
    crumbs.push({ label: 'Projects' })
  } else if (pathname === '/copilot') {
    crumbs.push({ label: 'Copilot' })
  }

  return crumbs
}
