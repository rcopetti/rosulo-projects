import { useRef, useMemo } from 'react'
import { cn } from '@/lib/utils'

export interface GanttTask {
  id: string
  title: string
  start_date: string | null
  due_date: string | null
  status: string
  completion_pct: number
  priority: string
}

export interface GanttDependency {
  id: string
  predecessor_id: string
  successor_id: string
  type: string
  lag_days: number
}

export interface GanttMilestone {
  id: string
  name: string
  target_date: string
  status: string
}

export interface GanttData {
  tasks: GanttTask[]
  dependencies: GanttDependency[]
  milestones: GanttMilestone[]
}

type ZoomLevel = 'day' | 'week' | 'month'

interface GanttChartProps {
  data: GanttData
  zoom?: ZoomLevel
  onZoomChange?: (zoom: ZoomLevel) => void
}

const ROW_HEIGHT = 40
const TASK_LIST_WIDTH = 280
const HEADER_HEIGHT = 48
const DAY_WIDTH_MAP: Record<ZoomLevel, number> = { day: 40, week: 16, month: 6 }

function parseDate(s: string | null): Date | null {
  if (!s) return null
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function formatMonthHeader(d: Date): string {
  return d.toLocaleString('default', { month: 'long', year: 'numeric' })
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

const statusColors: Record<string, string> = {
  todo: 'bg-slate-400',
  in_progress: 'bg-blue-500',
  review: 'bg-amber-500',
  done: 'bg-emerald-500',
  blocked: 'bg-red-500',
}

const priorityColors: Record<string, string> = {
  critical: 'border-red-500',
  high: 'border-amber-500',
  medium: 'border-blue-400',
  low: 'border-slate-300',
}

export function GanttChart({ data, zoom = 'week', onZoomChange }: GanttChartProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const dayWidth = DAY_WIDTH_MAP[zoom]

  const tasksWithDates = useMemo(
    () => data.tasks.filter((t) => t.start_date && t.due_date),
    [data.tasks]
  )

  const dateRange = useMemo(() => {
    const allDates: Date[] = []
    for (const t of tasksWithDates) {
      const s = parseDate(t.start_date)
      const e = parseDate(t.due_date)
      if (s) allDates.push(s)
      if (e) allDates.push(e)
    }
    for (const m of data.milestones) {
      const d = parseDate(m.target_date)
      if (d) allDates.push(d)
    }
    if (allDates.length === 0) {
      const today = new Date()
      return { start: addDays(today, -7), end: addDays(today, 30) }
    }
    const min = new Date(Math.min(...allDates.map((d) => d.getTime())))
    const max = new Date(Math.max(...allDates.map((d) => d.getTime())))
    return { start: addDays(min, -3), end: addDays(max, 7) }
  }, [tasksWithDates, data.milestones])

  const totalDays = daysBetween(dateRange.start, dateRange.end)
  const totalWidth = totalDays * dayWidth
  const totalHeight = tasksWithDates.length * ROW_HEIGHT + HEADER_HEIGHT

  const days = useMemo(() => {
    return Array.from({ length: totalDays }, (_, i) => addDays(dateRange.start, i))
  }, [dateRange.start, totalDays])

  const monthHeaders = useMemo(() => {
    const headers: { label: string; startCol: number; span: number }[] = []
    let current: { label: string; startCol: number; span: number } | null = null
    for (let i = 0; i < days.length; i++) {
      const d = days[i]
      if (d.getDate() === 1 || i === 0) {
        if (current) headers.push(current)
        current = { label: formatMonthHeader(d), startCol: i, span: 1 }
      } else if (current) {
        current.span++
      }
    }
    if (current) headers.push(current)
    return headers
  }, [days])

  const taskPositions = useMemo(() => {
    const map = new Map<string, { x: number; width: number; row: number }>()
    tasksWithDates.forEach((task, row) => {
      const s = parseDate(task.start_date)
      const e = parseDate(task.due_date)
      if (!s || !e) return
      const x = daysBetween(dateRange.start, s) * dayWidth
      const w = Math.max(daysBetween(s, e) * dayWidth, dayWidth)
      map.set(task.id, { x, width: w, row })
    })
    return map
  }, [tasksWithDates, dateRange.start, dayWidth])

  const today = new Date()
  const todayOffset = daysBetween(dateRange.start, today)

  return (
    <div className="flex flex-col rounded-lg border bg-card overflow-hidden">
      {/* Zoom controls */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <span className="text-sm font-medium">Gantt Chart</span>
        <div className="flex gap-1">
          {(['day', 'week', 'month'] as ZoomLevel[]).map((z) => (
            <button
              key={z}
              onClick={() => onZoomChange?.(z)}
              className={cn(
                'rounded px-2 py-1 text-xs font-medium transition-colors',
                zoom === z ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
              )}
            >
              {z.charAt(0).toUpperCase() + z.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex">
        {/* Task list (left panel) */}
        <div
          className="flex-shrink-0 border-r bg-muted/30"
          style={{ width: TASK_LIST_WIDTH, height: totalHeight }}
        >
          <div
            className="flex items-center border-b px-3 text-xs font-medium text-muted-foreground"
            style={{ height: HEADER_HEIGHT }}
          >
            Task Name
          </div>
          {tasksWithDates.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-2 border-b px-3 text-sm"
              style={{ height: ROW_HEIGHT }}
            >
              <div className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0', statusColors[task.status] || 'bg-slate-400')} />
              <span className="truncate" title={task.title}>{task.title}</span>
            </div>
          ))}
          {tasksWithDates.length === 0 && (
            <div className="flex items-center justify-center px-3 text-sm text-muted-foreground" style={{ height: ROW_HEIGHT * 3 }}>
              No tasks with dates
            </div>
          )}
        </div>

        {/* Timeline (right panel) */}
        <div className="flex-1 overflow-x-auto" ref={scrollRef}>
          <div style={{ width: totalWidth, height: totalHeight, position: 'relative' }}>
            {/* Month headers */}
            <div className="flex border-b" style={{ height: HEADER_HEIGHT }}>
              {monthHeaders.map((mh, i) => (
                <div
                  key={i}
                  className="flex items-center justify-center border-r text-xs font-medium text-muted-foreground"
                  style={{ width: mh.span * dayWidth }}
                >
                  {mh.label}
                </div>
              ))}
            </div>

            {/* Day headers + grid */}
            <div className="absolute top-0 left-0" style={{ height: totalHeight, width: totalWidth }}>
              {/* Day labels row */}
              {days.map((d, i) => {
                const show = zoom === 'day' || (zoom === 'week' && d.getDay() === 1) || (zoom === 'month' && d.getDate() === 1)
                if (!show) return null
                return (
                  <div
                    key={i}
                    className="absolute flex items-center justify-center border-r text-[10px] text-muted-foreground"
                    style={{ left: i * dayWidth, top: 0, width: dayWidth, height: HEADER_HEIGHT }}
                  >
                    {zoom === 'day' ? d.getDate() : zoom === 'week' ? `${d.getMonth() + 1}/${d.getDate()}` : d.toLocaleString('default', { month: 'short' })}
                  </div>
                )
              })}

              {/* Vertical grid lines */}
              {days.map((d, i) => (
                <div
                  key={`grid-${i}`}
                  className={cn(
                    'absolute border-r',
                    isSameDay(d, today) ? 'border-primary/30' : 'border-border/50'
                  )}
                  style={{ left: i * dayWidth, top: HEADER_HEIGHT, height: totalHeight - HEADER_HEIGHT, width: 0 }}
                />
              ))}

              {/* Horizontal row lines */}
              {tasksWithDates.map((_, i) => (
                <div
                  key={`row-${i}`}
                  className="absolute border-b border-border/50"
                  style={{ top: HEADER_HEIGHT + i * ROW_HEIGHT, left: 0, width: totalWidth, height: 0 }}
                />
              ))}

              {/* Today marker */}
              {todayOffset >= 0 && todayOffset < totalDays && (
                <div
                  className="absolute z-10 border-l-2 border-primary"
                  style={{ left: todayOffset * dayWidth, top: 0, height: totalHeight }}
                >
                  <div className="absolute -top-0 -ml-[18px] rounded-b bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                    Today
                  </div>
                </div>
              )}

              {/* Task bars */}
              {tasksWithDates.map((task) => {
                const pos = taskPositions.get(task.id)
                if (!pos) return null
                return (
                  <div
                    key={task.id}
                    className={cn(
                      'absolute z-20 flex items-center rounded-sm border-l-[3px] transition-all',
                      statusColors[task.status] || 'bg-slate-400',
                      priorityColors[task.priority] || 'border-slate-300'
                    )}
                    style={{
                      left: pos.x,
                      top: HEADER_HEIGHT + pos.row * ROW_HEIGHT + 8,
                      width: pos.width,
                      height: ROW_HEIGHT - 16,
                    }}
                    title={`${task.title} (${task.completion_pct}%)`}
                  >
                    {pos.width > 60 && (
                      <div className="flex h-full w-full items-center overflow-hidden rounded-r-sm bg-white/30">
                        <div
                          className="h-full rounded-r-sm bg-white/50"
                          style={{ width: `${task.completion_pct}%` }}
                        />
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Milestone diamonds */}
              {data.milestones.map((m) => {
                const d = parseDate(m.target_date)
                if (!d) return null
                const offset = daysBetween(dateRange.start, d)
                if (offset < 0 || offset >= totalDays) return null
                return (
                  <div
                    key={m.id}
                    className="absolute z-30 flex items-center justify-center"
                    style={{
                      left: offset * dayWidth - 6,
                      top: totalHeight - 24,
                    }}
                    title={m.name}
                  >
                    <div className={cn(
                      'h-3 w-3 rotate-45 border-2',
                      m.status === 'achieved' ? 'bg-emerald-500 border-emerald-700' :
                      m.status === 'missed' ? 'bg-red-500 border-red-700' :
                      'bg-amber-400 border-amber-600'
                    )} />
                  </div>
                )
              })}

              {/* Dependency arrows (SVG overlay) */}
              <svg
                className="absolute top-0 left-0 z-10 pointer-events-none"
                width={totalWidth}
                height={totalHeight}
                style={{ overflow: 'visible' }}
              >
                {data.dependencies.map((dep) => {
                  const from = taskPositions.get(dep.predecessor_id)
                  const to = taskPositions.get(dep.successor_id)
                  if (!from || !to) return null

                  const fromY = HEADER_HEIGHT + from.row * ROW_HEIGHT + ROW_HEIGHT / 2
                  const fromX = from.x + from.width
                  const toY = HEADER_HEIGHT + to.row * ROW_HEIGHT + ROW_HEIGHT / 2
                  const toX = to.x

                  const midX = fromX + (toX - fromX) / 2

                  return (
                    <g key={dep.id}>
                      <path
                        d={`M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`}
                        fill="none"
                        stroke="hsl(var(--muted-foreground))"
                        strokeWidth="1.5"
                        strokeDasharray={dep.type !== 'finish_to_start' ? '4 2' : undefined}
                      />
                      <polygon
                        points={`${toX},${toY} ${toX - 6},${toY - 3} ${toX - 6},${toY + 3}`}
                        fill="hsl(var(--muted-foreground))"
                      />
                    </g>
                  )
                })}
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
