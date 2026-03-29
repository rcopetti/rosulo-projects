import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ProjectsPage } from '@/pages/ProjectsPage'
import { ProjectLayout } from '@/pages/ProjectLayout'
import { ProjectDashboardPage } from '@/pages/ProjectDashboardPage'
import { WBSPage } from '@/pages/WBSPage'
import { TasksPage } from '@/pages/TasksPage'
import { SchedulePage } from '@/pages/SchedulePage'
import { CopilotPage } from '@/pages/CopilotPage'

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:projectId" element={<ProjectLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<ProjectDashboardPage />} />
          <Route path="wbs" element={<WBSPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="schedule" element={<SchedulePage />} />
          <Route path="copilot" element={<CopilotPage />} />
        </Route>
        <Route path="copilot" element={<CopilotPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
