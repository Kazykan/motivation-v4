"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  Check,
  Clock3,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  X,
  AlertTriangle,
  Trash2,
} from "lucide-react"
import { LogStatusValue, WeeklyReviewItem } from "@/types/props"
import { LogStatusEditor } from "@/components/LogStatusEditor"
import { useLogSyncStore } from "@/store/useLogSyncStore"
import { WEEK_DAYS_SHORT, formatDateISO } from "@/lib/dates"
import { formatMoney } from "@/lib/money"

interface ParentReviewCardProps {
  item: WeeklyReviewItem
  onApproveLog: (logId: number) => void
  onApproveAll: (logIds: number[]) => void
  onOpenDetail: (item: WeeklyReviewItem) => void
  onChangeLogStatus: (
    logId: number | null,
    status: LogStatusValue,
    taskId?: number,
    date?: string,
  ) => Promise<void>
}

export function ParentReviewCard({
  item,
  onApproveLog,
  onApproveAll,
  onOpenDetail,
  onChangeLogStatus,
}: ParentReviewCardProps) {
  const [selectedCell, setSelectedCell] = useState<{
    logId: number | null
    date: string
    status: LogStatusValue
    isOutOfSchedule: boolean
  } | null>(null)

  const buffer = useLogSyncStore((state) => state.buffer)
  const weekClosed = !!item.weekClosed

  const startDate = new Date(`${item.weekStart || "2025-10-20"}T12:00:00`)
  const weekDates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startDate)
    date.setDate(date.getDate() + index)
    return date
  })
  const weekEnd = weekDates[6]
  const weekLabel = `${weekDates[0].getDate()}–${weekEnd.getDate()} ${weekEnd.toLocaleDateString(
    "ru-RU",
    { month: "long" },
  )}`

  const taskLogs = Array.isArray(item.logs) ? item.logs : []
  const pendingLogs = taskLogs.filter((log) => log.status === "DONE")
  const approvedLogs = taskLogs.filter((log) => log.status === "APPROVED")

  const scheduledDays = item.targetDays ?? []
  const isFlexible = item.scheduleType === "FLEXIBLE"
  const targetCount = Math.max(0, item.targetCount ?? 0)

  const approvedCount = approvedLogs.length
  const pendingCount = pendingLogs.length
  const currentPendingLog = pendingLogs[0] ?? null

  const outOfScheduleLogs = isFlexible
    ? []
    : taskLogs.filter((log) => {
        if (log.status === "CANCELLED") return false
        const d = new Date(`${log.date}T12:00:00`)
        const isoWeekday = d.getDay() === 0 ? 7 : d.getDay()
        return !scheduledDays.includes(isoWeekday)
      })

  const hasOutOfScheduleWarning = outOfScheduleLogs.length > 0

  const handleStatusChange = async (logId: number | null, status: LogStatusValue) => {
    await onChangeLogStatus(logId, status, item.taskId, selectedCell?.date)
  }

  return (
    <Card className="overflow-hidden rounded-2xl border-brand-muted/20 bg-card shadow-sm">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-11 w-11 border border-brand-muted/20">
            <AvatarImage src={item.child.avatar} />
            <AvatarFallback>{(item.child.name || "Р").slice(0, 1)}</AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <p className="font-semibold text-brand-dark">{item.child.name}</p>
            <p className="text-xs text-brand-muted">Ребёнок · {item.child.age} лет</p>
          </div>

          {weekClosed ? (
            <Badge className="shrink-0 bg-brand-success-soft text-brand-success-strong hover:bg-brand-success-soft">
              Неделя закрыта
            </Badge>
          ) : pendingCount > 0 ? (
            <Badge className="shrink-0 bg-brand-warning-soft text-brand-warning-strong hover:bg-brand-warning-soft">
              {pendingCount} на проверке
            </Badge>
          ) : null}
        </div>

        <Separator />

        <div className="space-y-2">
          <h3 className="text-base font-bold text-brand-dark">{item.title}</h3>
          <div className="flex items-center gap-1.5 text-xs text-brand-muted">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            <span>{weekLabel}</span>
          </div>
        </div>

        <div className="space-y-3 rounded-xl bg-brand-surface p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-brand-dark">Выполнение за неделю</span>
            <span className="text-xs text-brand-muted">
              {isFlexible
                ? `${approvedCount} из ${targetCount} выполнено`
                : `${approvedCount} из ${scheduledDays.length} подтверждено`}
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {weekDates.map((date, index) => {
              const formattedDate = formatDateISO(date)
              const log = taskLogs.find((l) => l.date === formattedDate)

              const bufferKeyLog = log ? `log_${log.id}` : null
              const bufferKeyTask = `task_${item.taskId}_${formattedDate}`
              const bufferedItem = (bufferKeyLog && buffer[bufferKeyLog]) || buffer[bufferKeyTask]

              const status = bufferedItem ? bufferedItem.status : (log?.status ?? "NONE")
              const isPendingSync = !!bufferedItem

              const dayIndex = index + 1
              const isScheduled = !isFlexible && scheduledDays.includes(dayIndex)

              const isApproved = status === "APPROVED"
              const isPending = status === "DONE"
              const isRejected = status === "REJECTED"
              const isCancelled = status === "CANCELLED"

              const hasLog = !!log
              const isOutOfSchedule = !isFlexible && hasLog && !isScheduled && !isCancelled
              const isClickable = isFlexible || isScheduled || hasLog

              let statusLabel = "—"
              if (isOutOfSchedule) statusLabel = "Вне"
              else if (isApproved) statusLabel = "Готово"
              else if (isPending) statusLabel = "Ожидает"
              else if (isRejected) statusLabel = "Отказ"
              else if (isCancelled) statusLabel = "Удалено"
              else if (isScheduled) statusLabel = "План"

              return (
                <button
                  key={formattedDate}
                  type="button"
                  disabled={!isClickable}
                  onClick={() => {
                    if (isClickable) {
                      setSelectedCell({
                        logId: log ? log.id : null,
                        date: formattedDate,
                        status: status === "NONE" ? "DONE" : (status as LogStatusValue),
                        isOutOfSchedule,
                      })
                    }
                  }}
                  className={cn(
                    "relative flex min-w-0 flex-col items-center gap-1.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand-primary",
                    !isClickable && "cursor-not-allowed opacity-40",
                  )}
                >
                  {isPendingSync && (
                    <span className="absolute -right-1 -top-1 z-10 flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-primary opacity-75"></span>
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-primary-hover"></span>
                    </span>
                  )}

                  {isOutOfSchedule && (
                    <span className="absolute -left-1 -top-1 z-10 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-brand-error text-white">
                      <AlertTriangle className="h-2 w-2" />
                    </span>
                  )}

                  <span className="text-[11px] font-medium text-brand-muted">
                    {WEEK_DAYS_SHORT[index]}
                  </span>

                  <div
                    className={cn(
                      "flex aspect-square w-full items-center justify-center rounded-lg border text-sm font-semibold transition-colors",
                      isOutOfSchedule &&
                        "border-brand-error/30 bg-brand-error-soft text-brand-error-strong ring-1 ring-brand-error/30",
                      !isOutOfSchedule &&
                        isApproved &&
                        "border-brand-success/30 bg-brand-success-soft text-brand-success-strong",
                      !isOutOfSchedule &&
                        isPending &&
                        "border-brand-warning/40 bg-brand-warning-soft text-brand-warning-strong",
                      !isOutOfSchedule &&
                        isRejected &&
                        "border-brand-error/30 bg-brand-error-soft text-brand-error-strong",
                      !isOutOfSchedule &&
                        isCancelled &&
                        "border-brand-muted/20 bg-brand-surface-alt text-brand-muted",
                      !log &&
                        isClickable &&
                        status === "NONE" &&
                        "border-brand-muted/20 bg-background text-brand-dark hover:bg-brand-surface-alt",
                      !isClickable && "border-transparent bg-transparent text-brand-muted/40",
                      selectedCell?.date === formattedDate &&
                        "ring-2 ring-brand-primary ring-offset-2 ring-offset-background",
                    )}
                  >
                    {isApproved ? (
                      <Check className="h-4 w-4" />
                    ) : isPending ? (
                      <Clock3 className="h-4 w-4" />
                    ) : isRejected ? (
                      <X className="h-4 w-4" />
                    ) : isCancelled ? (
                      <Trash2 className="h-4 w-4" />
                    ) : (
                      date.getDate()
                    )}
                  </div>

                  <span
                    className={cn(
                      "text-[9px] font-medium leading-none",
                      isOutOfSchedule && "text-brand-error-strong",
                      !isOutOfSchedule && isApproved && "text-brand-success-strong",
                      !isOutOfSchedule && isPending && "text-brand-warning-strong",
                      !isOutOfSchedule && isRejected && "text-brand-error-strong",
                      !isOutOfSchedule && isCancelled && "text-brand-muted",
                      status === "NONE" && isClickable && "text-brand-muted",
                      !isClickable && "text-transparent",
                    )}
                  >
                    {statusLabel}
                  </span>
                </button>
              )
            })}
          </div>

          {hasOutOfScheduleWarning && (
            <div className="flex items-start gap-2 rounded-lg border border-brand-error/30 bg-brand-error-soft p-2.5 text-[11px] text-brand-error-strong">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <div className="flex flex-col gap-1">
                <span className="font-semibold">
                  {outOfScheduleLogs.length}{" "}
                  {outOfScheduleLogs.length === 1 ? "выполнение" : "выполнений"} вне расписания
                </span>
                <span>
                  На эти даты есть логи, но дни убраны из расписания задания. Нажмите на день, чтобы
                  изменить статус, «удалить» отметку (история сохранится) или верните день в
                  настройках задания.
                </span>
                <span>
                  Даты:{" "}
                  {outOfScheduleLogs
                    .map((l) =>
                      new Date(`${l.date}T12:00:00`).toLocaleDateString("ru-RU", {
                        day: "numeric",
                        month: "short",
                      }),
                    )
                    .join(", ")}
                </span>
              </div>
            </div>
          )}
        </div>

        {selectedCell && (
          <div className="space-y-2">
            {selectedCell.isOutOfSchedule && !weekClosed && (
              <div className="flex items-start gap-2 rounded-lg border border-brand-error/30 bg-brand-error-soft p-2.5 text-[11px] text-brand-error-strong">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Этот день вне расписания задания. Чтобы оплата за него учитывалась корректно,
                  верните день в расписании, «удалите» отметку или отклоните выполнение.
                </span>
              </div>
            )}

            <LogStatusEditor
              logId={selectedCell.logId ?? 0}
              date={selectedCell.date}
              status={selectedCell.status}
              weekClosed={weekClosed}
              onChangeStatus={handleStatusChange}
              onClose={() => setSelectedCell(null)}
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs text-brand-muted">Начислено</p>
            <p className="text-lg font-bold tabular-nums text-brand-dark">
              {formatMoney(item.summary.calculatedAmount ?? 0)}
            </p>
          </div>

          <div className="space-y-1 text-right">
            <p className="text-xs text-brand-muted">Максимум за неделю</p>
            <p className="text-lg font-bold tabular-nums text-brand-dark">
              {formatMoney(item.weeklyPrice)}
            </p>
          </div>
        </div>

        {currentPendingLog && !weekClosed && (
          <div className="space-y-2">
            <Button
              className="h-11 w-full rounded-xl bg-brand-primary font-semibold text-brand-dark hover:bg-brand-primary-hover"
              onClick={() => onApproveLog(currentPendingLog.id)}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Подтвердить{" "}
              {new Date(`${currentPendingLog.date}T12:00:00`).toLocaleDateString("ru-RU", {
                weekday: "long",
              })}
            </Button>
          </div>
        )}

        <button
          type="button"
          onClick={() => onOpenDetail(item)}
          className="flex w-full items-center justify-between rounded-lg pt-1 text-sm font-medium text-brand-muted transition-colors hover:text-brand-dark"
        >
          Открыть подробности недели
          <ChevronRight className="h-4 w-4" />
        </button>
      </CardContent>
    </Card>
  )
}
