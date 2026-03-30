export interface User {
  id: string
  email: string
  name: string
  avatar_url?: string | null
  role: string
  is_active: boolean
  is_verified: boolean
  created_at: string
  updated_at: string
}

export interface Organization {
  id: string
  name: string
  slug: string
  description: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface ProjectMember {
  id: string
  user_id: string
  project_id: string
  role: 'owner' | 'manager' | 'member' | 'viewer'
  user?: User
}

export interface Project {
  id: string
  org_id: string
  name: string
  description: string | null
  methodology: 'waterfall' | 'agile' | 'hybrid' | 'prince2' | 'custom'
  status: 'draft' | 'active' | 'on_hold' | 'completed' | 'archived'
  priority: 'low' | 'medium' | 'high' | 'critical'
  start_date?: string | null
  end_date?: string | null
  budget?: number | null
  budget_currency?: string
  complexity_score?: number | null
  risk_level?: string | null
  ai_enabled?: boolean
  created_at: string
  updated_at: string
}

export interface WBSItem {
  id: string
  project_id: string
  parent_id?: string
  code: string
  name: string
  description?: string
  type: string
  level: number
  sort_order: number
  budget_estimate?: number
  duration_estimate?: number
  children?: WBSItem[]
  task_count?: number
  created_at: string
  updated_at: string
}

export interface WBSTree {
  items: WBSItem[]
  root_items: WBSItem[]
}

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done' | 'blocked' | 'cancelled'
export type TaskPriority = 'lowest' | 'low' | 'medium' | 'high' | 'highest'
export type DependencyType = 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish'

export interface Task {
  id: string
  project_id: string
  wbs_item_id?: string | null
  parent_task_id?: string | null
  assigned_to?: string | null
  title: string
  description?: string | null
  status: TaskStatus
  priority: TaskPriority
  estimated_hours?: number | null
  actual_hours?: number | null
  start_date?: string | null
  due_date?: string | null
  completed_date?: string | null
  completion_pct: number
  tags?: string[] | null
  created_at: string
  updated_at: string
}

export interface TaskDependency {
  id: string
  predecessor_id: string
  successor_id: string
  type: DependencyType
  lag_days: number
  created_at: string
}

export interface CursorPaginatedTasks {
  items: Task[]
  next_cursor: string | null
  has_more: boolean
  total_count?: number | null
}

export interface Milestone {
  id: string
  project_id: string
  name: string
  description?: string
  target_date: string
  completed: boolean
  completed_at?: string
  created_at: string
}

export interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata?: Record<string, unknown>
  created_at: string
}

export interface Conversation {
  id: string
  project_id?: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
}

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  per_page: number
  pages: number
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}
