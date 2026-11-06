import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, CheckCircle2 } from "lucide-react"
import { TaskCardProps } from "@/types/props"

export function TaskCard({ task, isSubmitting, onComplete }: TaskCardProps) {
  return (
    <Card className="border-brand-muted/20">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm font-semibold text-brand-dark">{task.title}</CardTitle>
          <Badge variant="secondary" className="bg-brand-primary-soft text-brand-warning-strong">
            {task.price_per_run} ₽
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-0">
        <p className="text-xs text-brand-muted">{task.description}</p>
        <div className="flex items-center justify-between border-t border-brand-muted/15 pt-3">
          <div className="flex items-center gap-1 text-[11px] text-brand-muted">
            <Clock className="h-3.5 w-3.5" />
            <span>{task.schedule_type || "Гибкое"}</span>
          </div>
          <Button
            size="sm"
            className="h-8 bg-brand-primary text-brand-dark hover:bg-brand-primary-hover"
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
