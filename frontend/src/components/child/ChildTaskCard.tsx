"use client"

import { useMemo, useState } from "react"
import { CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Check, Clock3, X, RotateCcw } from "lucide-react"
import { ChildTaskCardProps, LogStatusValue } from "@/types/props"
import { ChildLogStatusEditor } from "./ChildLogStatusEditor"
import { useLogSyncStore } from "@/store/useLogSyncStore"
import { WEEK_DAYS_SHORT, formatDateISO } from "@/lib/dates"
import { formatMoney } from "@/lib/money"

type CellSelection = {
  logId: number | null
  date: string
  status: LogStatusValue | "NONE"
}

export function ChildTaskCard({ item, onChangeStatus }: ChildTaskCardProps) {
  const [selectedCell, setSelectedCell] = useState<CellSelection | null>(null)
  const [flash, setFlash] = useState<string | null>(null)

  const buffer = useLogSyncStore((state) => state.buffer)
  const weekClosed = !!item.weekClosed

  const weekDates = useMemo(() => {
    const start = new Date(`${item.weekStart}T12:00:00`)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      return d
    })
  }, [item.weekStart])

  const logs = Array.isArray(item.logs) ? item.logs : []
  const scheduledDays = item.targetDays ?? []
  const isFlexible = item.scheduleType === "FLEXIBLE"
  const targetCount = Math.max(0, item.targetCount ?? 0)

  const approvedCount = logs.filter((l) => l.status === "APPROVED").length
  const pendingCount = logs.filter((l) => l.status === "DONE").length

  const plannedRuns = isFlexible ? Math.max(targetCount, 1) : Math.max(scheduledDays.length, 1)
  const pricePerRun = Number(item.weeklyPrice) / plannedRuns

  const approvedAmount = logs
    .filter((l) => l.status === "APPROVED")
    .reduce((sum, l) => sum + Number(l.earned_amount ?? 0), 0)
  const pendingAmount = pendingCount * pricePerRun
  const canEarnAmount = Number(item.weeklyPrice)

  const getDayState = (date: Date) => {
    const iso = formatDateISO(date)
    const log = logs.find((l) => l.date === iso)
    const buffered = (log && buffer[`log_${log.id}`]) || buffer[`task_${item.taskId}_${iso}`]
    const status = (buffered?.status ?? log?.status ?? "NONE") as LogStatusValue | "NONE"
    return { log, status, iso }
  }

  const showFlash = (text: string) => {
    setFlash(text)
    window.setTimeout(() => setFlash(null), 1800)
  }

  const handleMarkDone = async (logId: number | null, date: string) => {
    await onChangeStatus(logId, "DONE", item.taskId, date)
    setSelectedCell(null)
    if (!weekClosed) showFlash(`+${formatMoney(pricePerRun)} ждёт проверки родителя`)
  }

  const handleCancel = async (logId: number) => {
    await onChangeStatus(logId, "CANCELLED", item.taskId, selectedCell?.date ?? "")
    setSelectedCell(null)
    showFlash("Отметка снята")
  }

  return (
    <div className="rounded-card bg-app-card p-5 text-text-main shadow-lg flex flex-col gap-4">
      <CardContent className="space-y-4 p-0">
        {/* Шапка */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex flex-col gap-1">
            <h3
              className="text-lg font-bold text-text-main leading-tight truncate"
              title={item.title}
            >
              {item.title}
            </h3>
            {item.description && (
              <p className="text-sm text-text-muted line-clamp-2">{item.description}</p>
            )}

            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] text-text-muted">
                {isFlexible
                  ? `${approvedCount} из ${targetCount} выполнено`
                  : `План: ${scheduledDays.length} дн.`}
              </span>
              <span className="rounded-full bg-finance-positive/10 px-2 py-0.5 text-[11px] font-semibold text-finance-positive">
                +{formatMoney(pricePerRun)} за раз
              </span>
            </div>
          </div>

          {/* Финансовый виджет — детские формулировки */}
          <div className="text-right shrink-0 flex flex-col gap-0.5 tabular-nums">
            <div className="text-[10px] uppercase tracking-wide text-text-muted">
              Можно заработать
            </div>
            <div className="text-lg font-bold text-text-main leading-tight">
              {formatMoney(canEarnAmount)}
            </div>

            <div className="mt-1 flex flex-col gap-0.5 text-[12px] leading-tight">
              <span className="flex items-center justify-end gap-1 text-finance-positive">
                <Check className="h-3 w-3 stroke-[2.5]" />
                {formatMoney(approvedAmount)} заработано
              </span>
              {pendingAmount > 0 && (
                <span className="flex items-center justify-end gap-1 text-finance-pending">
                  <Clock3 className="h-3 w-3" />
                  {formatMoney(pendingAmount)} ждёт проверки
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Календарь */}
        <div className="space-y-2 rounded-button bg-app-surface p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-text-main">Расписание недели</span>
            <span className="text-[11px] text-text-muted">
              {item.weekStart} — {item.weekEnd}
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {weekDates.map((date, index) => {
              const { log, status, iso } = getDayState(date)
              const dayIndex = index + 1
              const isScheduled = !isFlexible && scheduledDays.includes(dayIndex)
              const isApproved = status === "APPROVED"
              const isPending = status === "DONE"
              const isRejected = status === "REJECTED"
              const isCancelled = status === "CANCELLED"
              const hasLog = !!log
              const isClickable = isFlexible || isScheduled || hasLog

              let ariaLabel = `${WEEK_DAYS_SHORT[index]}, ${date.getDate()}`
              if (isApproved) ariaLabel += " — подтверждено"
              else if (isPending) ariaLabel += " — ожидает родителя"
              else if (isRejected) ariaLabel += " — отклонено"
              else if (isCancelled) ariaLabel += " — отменено"
              else if (isScheduled) ariaLabel += " — запланировано"

              return (
                <button
                  key={iso}
                  type="button"
                  disabled={!isClickable || weekClosed}
                  onClick={() =>
                    isClickable &&
                    !weekClosed &&
                    setSelectedCell({ logId: log?.id ?? null, date: iso, status })
                  }
                  title={ariaLabel}
                  aria-label={ariaLabel}
                  className={cn(
                    "relative flex flex-col items-center gap-1 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand-action",
                    (!isClickable || weekClosed) && "cursor-not-allowed opacity-30",
                  )}
                >
                  <span className="text-[10px] font-medium text-text-muted">
                    {WEEK_DAYS_SHORT[index]}
                  </span>

                  <div
                    className={cn(
                      "flex aspect-square w-full items-center justify-center rounded-xl border text-sm font-semibold transition-all",
                      isApproved &&
                        "border-finance-positive/30 bg-finance-positive/10 text-finance-positive",
                      isPending &&
                        "border-finance-pending/40 bg-finance-pending/10 text-finance-pending",
                      isRejected &&
                        "border-finance-negative/30 bg-finance-negative/10 text-finance-negative",
                      isCancelled && "border-app-surface bg-app-surface text-text-muted",
                      status === "NONE" &&
                        isClickable &&
                        "border-app-surface bg-app-bg text-text-main hover:bg-app-surface",
                      !isClickable && "border-transparent bg-transparent text-text-muted",
                      selectedCell?.date === iso &&
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
                      <RotateCcw className="h-3.5 w-3.5" />
                    ) : (
                      date.getDate()
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Обратная связь после клика */}
        {flash && (
          <div className="rounded-xl border border-finance-positive/30 bg-finance-positive/10 p-2.5 text-center text-[12px] font-medium text-finance-positive">
            {flash}
          </div>
        )}

        {weekClosed && (
          <div className="rounded-xl border border-finance-positive/30 bg-finance-positive/10 p-3 text-[11px] text-finance-positive">
            Неделя закрыта. Изменять отметки нельзя.
          </div>
        )}

        {/* Редактор */}
        {selectedCell && !weekClosed && (
          <ChildLogStatusEditor
            logId={selectedCell.logId}
            date={selectedCell.date}
            status={selectedCell.status}
            weekClosed={weekClosed}
            onMarkDone={handleMarkDone}
            onCancel={handleCancel}
            onClose={() => setSelectedCell(null)}
          />
        )}
      </CardContent>
    </div>
  )
}
