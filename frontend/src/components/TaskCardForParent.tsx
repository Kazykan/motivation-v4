"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Repeat, Edit2, Trash2, User } from "lucide-react"
import { TaskCardForParentProps } from "@/types/props"

const DAYS_MAP: Record<number, string> = {
  1: "Пн",
  2: "Вт",
  3: "Ср",
  4: "Чт",
  5: "Пт",
  6: "Сб",
  7: "Вс",
}

export function TaskCardForParent({ task, onEdit, onDelete }: TaskCardForParentProps) {
  // Расчет стоимости за одно выполнение, если бэкенд не отдал готовое
  const calculatedPricePerRun = () => {
    if (task.price_per_run) return task.price_per_run
    const runs =
      task.schedule_type === "FLEXIBLE"
        ? task.target_count || 1
        : (task.target_days || []).length || 1
    return Math.round((Number(task.weekly_price) / runs) * 100) / 100
  }

  return (
    <Card className="border-slate-200 bg-white shadow-xs">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-sm font-semibold text-brand-dark">{task.title}</CardTitle>
            {task.child_name && (
              <span className="flex items-center gap-1 text-[11px] text-brand-muted">
                <User className="h-3 w-3" /> Ребенок:{" "}
                <strong className="text-slate-800">{task.child_name}</strong>
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onEdit(task)}
              aria-label="Редактировать"
            >
              <Edit2 className="h-3.5 w-3.5 text-brand-muted hover:text-brand-dark" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onDelete(task.id)}
              aria-label="Удалить"
            >
              <Trash2 className="h-3.5 w-3.5 text-brand-error" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-0">
        {task.description && <p className="text-xs text-brand-muted">{task.description}</p>}

        {/* Лейблы специфики расписания и стоимости */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {task.schedule_type === "FLEXIBLE" ? (
            <Badge variant="secondary" className="bg-slate-100 text-slate-700">
              <Repeat className="mr-1 h-3 w-3" />
              Гибкое: {task.target_count} раз(а) в неделю
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-slate-100 text-slate-700">
              <Calendar className="mr-1 h-3 w-3" />
              Дни: {(task.target_days || []).map((d) => DAYS_MAP[Number(d)] || d).join(", ")}
            </Badge>
          )}

          <Badge variant="secondary" className="bg-amber-100 text-amber-900 font-medium">
            Неделя: {task.weekly_price} ₽
          </Badge>

          <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
            За 1 раз: {calculatedPricePerRun()} ₽
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
