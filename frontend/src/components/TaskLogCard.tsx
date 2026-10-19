// src/app/child/balance/_components/TaskLogCard.tsx
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2 } from "lucide-react"

interface TaskLogCardProps {
  log: {
    id: number
    task_title?: string
    date: string
    earned?: number
  }
}

export function TaskLogCard({ log }: TaskLogCardProps) {
  return (
    <Card className="border-slate-200">
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-slate-900">
              {log.task_title || "Задание выполнено"}
            </span>
            <span className="text-xs text-slate-500">{log.date}</span>
          </div>
        </div>
        <span className="text-sm font-semibold text-emerald-600">+{log.earned || 300} ₽</span>
      </CardContent>
    </Card>
  )
}
