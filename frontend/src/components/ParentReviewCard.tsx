"use client"

import { useState } from "react"
import { CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { Check, Clock3, CheckCircle2, X, AlertTriangle, Trash2 } from "lucide-react"
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

  const taskLogs = Array.isArray(item.logs) ? item.logs : []
  const pendingLogs = taskLogs.filter((log) => log.status === "DONE")
  const approvedLogs = taskLogs.filter((log) => log.status === "APPROVED")

  const scheduledDays = item.targetDays ?? []
  const isFlexible = item.scheduleType === "FLEXIBLE"
  const targetCount = Math.max(0, item.targetCount ?? 0)

  const approvedCount = approvedLogs.length
  const pendingCount = pendingLogs.length

  const hasPending = pendingCount > 0

  const getDayStatus = (date: Date) => {
    const formattedDate = formatDateISO(date)
    const log = taskLogs.find((itemLog) => itemLog.date === formattedDate)
    const bufferKeyLog = log ? `log_${log.id}` : null
    const bufferKeyTask = `task_${item.taskId}_${formattedDate}`
    const bufferedItem = (bufferKeyLog && buffer[bufferKeyLog]) || buffer[bufferKeyTask]
    const status = bufferedItem ? bufferedItem.status : (log?.status ?? "NONE")
    return { log, status }
  }

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
    setSelectedCell(null)
  }

  const earnedAmount = item.summary.calculatedAmount ?? 0

  const statusLabel = weekClosed
    ? "Закрыта"
    : pendingCount > 0
      ? `${pendingCount} на проверке`
      : "Активна"

  return (
    <div
      onClick={() => onOpenDetail(item)}
      className={cn(
        "group relative w-full cursor-pointer",
        "rounded-card overflow-hidden",
        "border border-app-surface",
        "bg-app-card",
        "shadow-sm",
        "transition-transform hover:scale-[1.005]",
      )}
    >
      <div className="relative p-4">
        <CardContent className="space-y-4 p-0" onClick={(e) => e.stopPropagation()}>
          {/* 1. Шапка */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 pt-0.5">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={item.child.avatar} />
                <AvatarFallback className="bg-app-surface text-text-main text-sm">
                  {(item.child.name || "Р").slice(0, 1)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex flex-col gap-1">
                <p className="font-semibold text-text-main text-base leading-tight truncate">
                  {item.child.name}
                </p>
                <span
                  className={cn(
                    "text-[11px] font-medium flex items-center gap-1.5",
                    hasPending && !weekClosed
                      ? "text-finance-pending"
                      : weekClosed
                        ? "text-text-muted"
                        : "text-finance-positive",
                  )}
                >
                  {hasPending && !weekClosed && <Clock3 className="h-3 w-3" />}
                  {statusLabel}
                </span>
              </div>
            </div>

            <div className="text-right shrink-0 pt-0.5">
              <div className="text-lg font-extrabold text-text-main tabular-nums leading-tight">
                {formatMoney(earnedAmount)}
              </div>
              <div className="text-[11px] text-text-muted tabular-nums">
                из {formatMoney(item.weeklyPrice)}
              </div>
            </div>
          </div>

          {/* 2. Название задания */}
          <div>
            <h3
              className="text-lg font-bold text-text-main leading-tight truncate"
              title={item.title}
            >
              {item.title}
            </h3>
            {item.description && (
              <p className="mt-1 text-xs text-text-muted line-clamp-2">{item.description}</p>
            )}
          </div>

          {/* 3. Календарь */}
          <div className="space-y-2 rounded-button bg-app-surface p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-main">Расписание недели</span>
              <span className="text-xs text-text-muted">
                {isFlexible
                  ? `${approvedCount} из ${targetCount} выполнено`
                  : `План: ${scheduledDays.length} дн.`}
              </span>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {weekDates.map((date, index) => {
                const formattedDate = formatDateISO(date)
                const { log, status } = getDayStatus(date)
                const dayIndex = index + 1
                const isScheduled = !isFlexible && scheduledDays.includes(dayIndex)
                const isApproved = status === "APPROVED"
                const isPending = status === "DONE"
                const isRejected = status === "REJECTED"
                const isCancelled = status === "CANCELLED"
                const hasLog = !!log
                const isOutOfSchedule = !isFlexible && hasLog && !isScheduled && !isCancelled
                const isClickable = isFlexible || isScheduled || hasLog

                let ariaLabel = `${WEEK_DAYS_SHORT[index]}, ${date.getDate()}`
                if (isOutOfSchedule) ariaLabel += " — вне расписания"
                else if (isApproved) ariaLabel += " — выполнено"
                else if (isPending) ariaLabel += " — ожидает проверки"
                else if (isRejected) ariaLabel += " — отклонено"
                else if (isCancelled) ariaLabel += " — удалено"
                else if (isScheduled) ariaLabel += " — запланировано"

                return (
                  <button
                    key={formattedDate}
                    type="button"
                    disabled={!isClickable}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (isClickable) {
                        setSelectedCell({
                          logId: log ? log.id : null,
                          date: formattedDate,
                          status: status === "NONE" ? "DONE" : (status as LogStatusValue),
                          isOutOfSchedule,
                        })
                      }
                    }}
                    title={ariaLabel}
                    aria-label={ariaLabel}
                    className={cn(
                      "relative flex flex-col items-center gap-1 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand-action",
                      !isClickable && "cursor-not-allowed opacity-30",
                    )}
                  >
                    {isOutOfSchedule && (
                      <span className="absolute -left-1 -top-1 z-10 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-finance-negative text-card">
                        <AlertTriangle className="h-2 w-2" />
                      </span>
                    )}

                    <span className="text-[10px] font-medium text-text-muted">
                      {WEEK_DAYS_SHORT[index]}
                    </span>

                    <div
                      className={cn(
                        "flex aspect-square w-full items-center justify-center rounded-xl border text-sm font-semibold transition-all",
                        // вне расписания — акцент на ошибку
                        isOutOfSchedule &&
                          "border-finance-negative/30 bg-finance-negative/10 text-finance-negative",
                        // подтверждено — позитивный
                        !isOutOfSchedule &&
                          isApproved &&
                          "border-finance-positive/30 bg-finance-positive/10 text-finance-positive",
                        // ожидает — янтарный
                        !isOutOfSchedule &&
                          isPending &&
                          "border-finance-pending/40 bg-finance-pending/10 text-finance-pending",
                        // отклонено — негативный
                        !isOutOfSchedule &&
                          isRejected &&
                          "border-finance-negative/30 bg-finance-negative/10 text-finance-negative",
                        // отменено — muted
                        !isOutOfSchedule &&
                          isCancelled &&
                          "border-app-surface bg-app-surface text-text-muted",
                        // пустой кликабельный
                        !log &&
                          isClickable &&
                          status === "NONE" &&
                          "border-app-surface bg-app-bg text-text-main hover:bg-app-surface",
                        // некликабельный
                        !isClickable && "border-transparent bg-transparent text-text-muted",
                        // выбранная ячейка
                        selectedCell?.date === formattedDate &&
                          "ring-2 ring-brand-action ring-offset-2 ring-offset-app-card",
                      )}
                    >
                      {isApproved ? (
                        <Check className="h-4 w-4 stroke-[2.5]" />
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
                  </button>
                )
              })}
            </div>

            {hasOutOfScheduleWarning && (
              <div className="flex items-start gap-2 rounded-xl border border-finance-negative/30 bg-finance-negative/10 p-2.5 text-[11px] text-finance-negative mt-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <div className="flex flex-col gap-1">
                  <span className="font-semibold">
                    {outOfScheduleLogs.length}{" "}
                    {outOfScheduleLogs.length === 1 ? "выполнение" : "выполнений"} вне расписания
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 4. Редактор статуса */}
          {selectedCell && (
            <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
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

          {/* 5. Кнопка подтверждения */}
          {pendingCount > 0 && !weekClosed && (
            <div onClick={(e) => e.stopPropagation()} className="pt-1">
              {pendingCount > 1 ? (
                <Button
                  className="h-11 w-full rounded-button bg-brand-action font-semibold text-brand-action-text hover:bg-brand-action-hover"
                  onClick={() => onApproveAll(pendingLogs.map((l) => l.id))}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Подтвердить всё ({pendingCount})
                </Button>
              ) : (
                <Button
                  className="h-11 w-full rounded-button bg-brand-action font-semibold text-brand-action-text hover:bg-brand-action-hover"
                  onClick={() => onApproveLog(pendingLogs[0].id)}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Подтвердить{" "}
                  {new Date(`${pendingLogs[0].date}T12:00:00`).toLocaleDateString("ru-RU", {
                    weekday: "long",
                  })}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </div>
    </div>
  )
}
