import { useParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { CalendarDays, Flag, Plus } from 'lucide-react'

export function SchedulePage() {
  const { projectId } = useParams<{ projectId: string }>()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Schedule</h2>
          <p className="text-sm text-muted-foreground">Project timeline and milestones</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Milestone
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Flag className="h-4 w-4" />
                Milestones
              </CardTitle>
              <CardDescription>Key project milestones</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                <p>No milestones defined yet</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="h-4 w-4" />
                Gantt Chart
              </CardTitle>
              <CardDescription>Visual project timeline</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex h-[400px] items-center justify-center rounded-lg border border-dashed text-muted-foreground">
                <div className="text-center">
                  <CalendarDays className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  <p className="font-medium">Gantt Chart</p>
                  <p className="text-sm">Timeline visualization will appear here</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Critical Path</CardTitle>
          <CardDescription>Automatically calculated critical path analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
            <p>Critical path analysis requires tasks with dependencies and durations</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
