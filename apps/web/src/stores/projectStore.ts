import { create } from 'zustand'
import type { Project } from '@/types'

interface ProjectState {
  currentProject: Project | null
  sidebarCollapsed: boolean
  setCurrentProject: (project: Project | null) => void
  toggleSidebar: () => void
}

export const useProjectStore = create<ProjectState>()((set) => ({
  currentProject: null,
  sidebarCollapsed: false,
  setCurrentProject: (project) => set({ currentProject: project }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}))
