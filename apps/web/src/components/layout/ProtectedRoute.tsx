import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useCurrentUser } from '@/hooks/useAuth'
import { apiGet } from '@/lib/api/client'
import { Skeleton } from '@/components/ui/skeleton'
import type { ReactNode } from 'react'
import type { Organization } from '@/types'

interface ProtectedRouteProps {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const activeOrgId = useAuthStore((s) => s.activeOrgId)
  const logout = useAuthStore((s) => s.logout)
  const setActiveOrgId = useAuthStore((s) => s.setActiveOrgId)
  const [orgLoaded, setOrgLoaded] = useState(false)

  const { isLoading, isError } = useCurrentUser()

  useEffect(() => {
    if (token && !activeOrgId && !orgLoaded) {
      apiGet<Organization[]>('/users/me/orgs')
        .then((orgs) => {
          if (orgs.length > 0) {
            setActiveOrgId(orgs[0].id)
          }
        })
        .catch(() => {})
        .finally(() => setOrgLoaded(true))
    } else if (activeOrgId || !token) {
      setOrgLoaded(true)
    }
  }, [token, activeOrgId, orgLoaded, setActiveOrgId])

  if (!token || !isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (isError) {
    logout()
    return <Navigate to="/login" replace />
  }

  if (isLoading || !user || !orgLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    )
  }

  return <>{children}</>
}
