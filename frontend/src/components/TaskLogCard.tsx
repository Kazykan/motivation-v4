import { Card, CardContent } from "@/components/ui/card"
import { TaskLogCardProps } from "@/types/props"
import { CheckCircle2 } from "lucide-react"
import { formatShortDay } from "@/lib/dates"
import { formatMoney } from "@/lib/money"

export function TaskLogCard({ log }: TaskLogCardProps) {
  return (
    <Card className="border-app-surface bg-app-card">
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-success-soft text-brand-success-strong">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-text-main">
              {log.task_title || "Задание выполнено"}
            </span>
            <span className="text-xs text-text-muted">{formatShortDay(log.date)}</span>
          </div>
        </div>
        <span className="text-sm font-semibold text-finance-positive">
          {formatMoney(log.earned ?? 0)}
        </span>
      </CardContent>
    </Card>
  )
}
