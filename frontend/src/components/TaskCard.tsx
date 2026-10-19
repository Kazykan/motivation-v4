// src/app/child/tasks/_components/TaskCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, CheckCircle2 } from "lucide-react"

interface TaskCardProps {
  task: {
    id: number
    title: string
    description: string
    price_per_run: number
    schedule_type?: string
  }
  isSubmitting: boolean
  onComplete: (taskId: number) => void
}

export function TaskCard({ task, isSubmitting, onComplete }: TaskCardProps) {
  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm font-semibold text-slate-900">{task.title}</CardTitle>
          <Badge variant="secondary" className="bg-amber-100 text-amber-800">
            {task.price_per_run} ₽
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-0">
        <p className="text-xs text-slate-600">{task.description}</p>
        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <Clock className="h-3.5 w-3.5" />
            <span>{task.schedule_type || "Гибкое"}</span>
          </div>
          <Button
            size="sm"
            className="h-8 bg-amber-400 text-slate-900 hover:bg-amber-500"
            disabled={isSubmitting}
            onClick={() => onComplete(task.id)}
          >
            <CheckCircle2 className="mr-1.5 h-4 w-4" />
            {isSubmitting ? "Отправка..." : "Отметить выполнение"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
