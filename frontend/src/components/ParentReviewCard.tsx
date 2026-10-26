// src/components/ParentReviewCard.tsx
"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { Check, Clock3, CalendarDays, CheckCircle2, ChevronRight } from "lucide-react"
import { WeeklyReviewItem, WeeklyReviewTaskLog } from "@/types/props"

const WEEK_DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  APPROVED: { label: "Подтверждено", className: "bg-emerald-100 text-emerald-700" },
  DONE: { label: "Ожидает", className: "bg-amber-100 text-amber-800" },
  REJECTED: { label: "Отклонено", className: "bg-red-100 text-red-700" },
  PENDING: { label: "Не выполнено", className: "bg-muted text-muted-foreground" },
}

interface ParentReviewCardProps {
  item: WeeklyReviewItem
  onApproveLog: (logId: number) => void
  onApproveAll: (logIds: number[]) => void
  onOpenDetail: (item: WeeklyReviewItem) => void
}

export function ParentReviewCard({
  item,
  onApproveLog,
  onApproveAll,
  onOpenDetail,
}: ParentReviewCardProps) {
  const formatDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const formatMoney = (amount: string | number) =>
    new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(Number(amount)) + " ₽"

  const startDate = new Date(`${item.weekStart || "2025-10-20"}T12:00:00`)
  const weekDates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startDate)
    date.setDate(date.getDate() + index)
    return date
  })
  const weekEnd = weekDates[6]
  const weekLabel = `${weekDates[0].getDate()}–${weekEnd.getDate()} ${weekEnd.toLocaleDateString("ru-RU", { month: "long" })}`

  const taskLogs = Array.isArray(item.logs) ? item.logs : []
  const pendingLogs = taskLogs.filter((l) => l.status === "DONE")
  const currentLog = pendingLogs[0]

  return (
    <Card className="overflow-hidden rounded-2xl border-border/60 bg-card shadow-sm">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-11 w-11">
              <AvatarImage src={item.child.avatar} />
              <AvatarFallback>{(item.child.name || "Р").slice(0, 1)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-slate-900">{item.child.name}</p>
              <p className="text-xs text-muted-foreground">Ребёнок · {item.child.age} лет</p>
            </div>
          </div>

          {item.summary.pendingCount > 0 && (
            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
              {item.summary.pendingCount} ожидают
            </Badge>
          )}
        </div>

        <div className="space-y-1">
          <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>{weekLabel}</span>
            <span>·</span>
            <span>
              {item.scheduleType === "FLEXIBLE"
                ? `Гибкое · ${item.targetCount} раза в неделю`
                : "Фиксированное расписание"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {weekDates.map((date, index) => {
            const log = taskLogs.find((l) => l.date === formatDate(date))
            const status = log?.status ?? "PENDING"
            const styles = STATUS_STYLES[status] || STATUS_STYLES.PENDING

            return (
              <div key={index} className="flex flex-col items-center gap-1">
                <span className="text-[11px] text-muted-foreground">{WEEK_DAYS[index]}</span>
                <span
                  className={cn(
                    "flex h-9 w-full items-center justify-center rounded-lg text-xs font-medium transition-colors",
                    log ? styles.className : "bg-muted/50 text-muted-foreground",
                  )}
                >
                  {status === "APPROVED" ? (
                    <Check className="h-4 w-4" />
                  ) : status === "DONE" ? (
                    <Clock3 className="h-4 w-4" />
                  ) : status === "REJECTED" ? (
                    "!"
                  ) : (
                    date.getDate()
                  )}
                </span>
              </div>
            )
          })}
        </div>

        <Separator />

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Подтверждено · Ожидает</span>
          <span className="font-medium">
            {item.summary.approvedCount} · {item.summary.pendingCount}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Начисление</p>
            <p className="font-semibold text-slate-900">
              {formatMoney(currentLog?.earned_amount ?? item.summary.calculatedAmount)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">За неделю</p>
            <p className="font-semibold text-slate-900">{formatMoney(item.weeklyPrice)}</p>
          </div>
        </div>

        {currentLog && (
          <div className="space-y-2">
            <Button
              className="w-full rounded-xl bg-amber-400 text-slate-900 hover:bg-amber-500 font-semibold h-11 cursor-pointer"
              onClick={() => onApproveLog(currentLog.id)}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Подтвердить{" "}
              {new Date(`${currentLog.date}T12:00:00`).toLocaleDateString("ru-RU", {
                weekday: "long",
              })}
            </Button>

            {pendingLogs.length > 1 && (
              <Button
                variant="outline"
                className="w-full rounded-xl h-11 cursor-pointer"
                onClick={() => onApproveAll(pendingLogs.map((l) => l.id))}
              >
                Подтвердить все ({pendingLogs.length})
              </Button>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => onOpenDetail(item)}
          className="flex w-full items-center justify-between pt-1 text-sm text-muted-foreground hover:text-foreground cursor-pointer"
        >
          Подробнее о неделе
          <ChevronRight className="h-4 w-4" />
        </button>
      </CardContent>
    </Card>
  )
}
