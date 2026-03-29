export interface User {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface Organization {
  id: string
  name: string
  slug: string
  created_at: string
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
  name: string
  description: string
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
  methodology: 'waterfall' | 'agile' | 'hybrid'
  start_date?: string
  end_date?: string
  budget?: number
  organization_id: string
  owner_id: string
  members?: ProjectMember[]
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

export interface Task {
  id: string
  project_id: string
  wbs_item_id?: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'review' | 'done' | 'blocked'
  priority: 'low' | 'medium' | 'high' | 'critical'
  assignee_id?: string
  assignee?: User
  estimated_hours?: number
  actual_hours?: number
  start_date?: string
  due_date?: string
  completed_at?: string
  created_at: string
  updated_at: string
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

export interface AuthResponse {
  access_token: string
  token_type: string
  user: User
}
