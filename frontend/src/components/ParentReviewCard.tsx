// frontend/src/components/ParentReviewCard.tsx
"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { Check, Clock3, CalendarDays, CheckCircle2, ChevronRight, X } from "lucide-react"
import { WeeklyReviewItem } from "@/types/props"
import { LogStatusEditor, LogStatus } from "@/components/LogStatusEditor"
import { LogHistoryViewer } from "@/components/LogHistoryViewer"
import { useLogSyncStore } from "@/store/useLogSyncStore"

const WEEK_DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]

interface ParentReviewCardProps {
  item: WeeklyReviewItem
  onApproveLog: (logId: number) => void
  onApproveAll: (logIds: number[]) => void
  onOpenDetail: (item: WeeklyReviewItem) => void
  onChangeLogStatus: (
    logId: number | null,
    status: LogStatus,
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
    status: LogStatus
  } | null>(null)

  const buffer = useLogSyncStore((state) => state.buffer)

  const formatDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const formatMoney = (amount: string | number) =>
    new Intl.NumberFormat("ru-RU", {
      maximumFractionDigits: 2,
    }).format(Number(amount)) + " ₽"

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
  const rejectedLogs = taskLogs.filter((log) => log.status === "REJECTED")

  const scheduledDays = item.targetDays ?? []
  const isFlexible = item.scheduleType === "FLEXIBLE"
  const targetCount = Math.max(0, item.targetCount ?? 0)

  const approvedCount = approvedLogs.length
  const pendingCount = pendingLogs.length
  const currentPendingLog = pendingLogs[0] ?? null

  const handleStatusChange = async (logId: number | null, status: LogStatus) => {
    await onChangeLogStatus(logId, status, item.taskId, selectedCell?.date)
  }

  return (
    <Card className="overflow-hidden rounded-2xl border-border/60 bg-card shadow-sm">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-11 w-11 border border-border/60">
            <AvatarImage src={item.child.avatar} />
            <AvatarFallback>{(item.child.name || "Р").slice(0, 1)}</AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">{item.child.name}</p>
            <p className="text-xs text-muted-foreground">Ребёнок · {item.child.age} лет</p>
          </div>

          {pendingCount > 0 && (
            <Badge className="shrink-0 bg-amber-100 text-amber-800 hover:bg-amber-100">
              {pendingCount} на проверке
            </Badge>
          )}
        </div>

        <Separator />

        <div className="space-y-2">
          <h3 className="text-base font-bold text-foreground">{item.title}</h3>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            <span>{weekLabel}</span>
          </div>
        </div>

        <div className="space-y-3 rounded-xl bg-muted/40 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Выполнение за неделю</span>

            <span className="text-xs text-muted-foreground">
              {isFlexible
                ? `${approvedCount} из ${targetCount} выполнено`
                : `${approvedCount} из ${scheduledDays.length} подтверждено`}
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {weekDates.map((date, index) => {
              const formattedDate = formatDate(date)
              const log = taskLogs.find((l) => l.date === formattedDate)

              const bufferKeyLog = log ? `log_${log.id}` : null
              const bufferKeyTask = `task_${item.taskId}_${formattedDate}`
              const bufferedItem = (bufferKeyLog && buffer[bufferKeyLog]) || buffer[bufferKeyTask]

              const status = bufferedItem ? bufferedItem.status : (log?.status ?? "NONE")
              const isPendingSync = !!bufferedItem

              const dayIndex = index + 1
              const isScheduled = !isFlexible && scheduledDays.includes(dayIndex)
              const isClickable = isFlexible || isScheduled

              const isApproved = status === "APPROVED"
              const isPending = status === "DONE"
              const isRejected = status === "REJECTED"

              let statusLabel = "—"
              if (isApproved) statusLabel = "Готово"
              else if (isPending) statusLabel = "Ожидает"
              else if (isRejected) statusLabel = "Отказ"
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
                        status: status === "NONE" ? "DONE" : (status as LogStatus),
                      })
                    }
                  }}
                  className={cn(
                    "flex min-w-0 flex-col items-center gap-1.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary relative",
                    !isClickable && "opacity-40 cursor-not-allowed",
                  )}
                >
                  {isPendingSync && (
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 z-10">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                    </span>
                  )}

                  <span className="text-[11px] font-medium text-muted-foreground">
                    {WEEK_DAYS[index]}
                  </span>

                  <div
                    className={cn(
                      "flex aspect-square w-full items-center justify-center rounded-lg border text-sm font-semibold transition-colors",
                      isApproved && "border-emerald-200 bg-emerald-100 text-emerald-700",
                      isPending && "border-amber-200 bg-amber-100 text-amber-800",
                      isRejected && "border-red-200 bg-red-100 text-red-700",
                      !log &&
                        isClickable &&
                        status === "NONE" &&
                        "border-border bg-background text-foreground hover:bg-muted",
                      !isClickable && "border-transparent bg-transparent text-muted-foreground/40",
                      selectedCell?.date === formattedDate &&
                        "ring-2 ring-primary ring-offset-2 ring-offset-background",
                    )}
                  >
                    {isApproved ? (
                      <Check className="h-4 w-4" />
                    ) : isPending ? (
                      <Clock3 className="h-4 w-4" />
                    ) : isRejected ? (
                      <X className="h-4 w-4" />
                    ) : (
                      date.getDate()
                    )}
                  </div>

                  <span
                    className={cn(
                      "text-[9px] font-medium leading-none",
                      isApproved && "text-emerald-700",
                      isPending && "text-amber-700",
                      isRejected && "text-red-700",
                      status === "NONE" && isClickable && "text-muted-foreground",
                      !isClickable && "text-transparent",
                    )}
                  >
                    {statusLabel}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {selectedCell && (
          <LogStatusEditor
            logId={selectedCell.logId ?? 0}
            date={selectedCell.date}
            status={selectedCell.status}
            onChangeStatus={handleStatusChange}
            onClose={() => setSelectedCell(null)}
          />
        )}

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Начислено</p>
            <p className="text-lg font-bold tabular-nums text-foreground">
              {formatMoney(item.summary.calculatedAmount ?? 0)}
            </p>
          </div>

          <div className="space-y-1 text-right">
            <p className="text-xs text-muted-foreground">Максимум за неделю</p>
            <p className="text-lg font-bold tabular-nums text-foreground">
              {formatMoney(item.weeklyPrice)}
            </p>
          </div>
        </div>

        {currentPendingLog && (
          <div className="space-y-2">
            <Button
              className="h-11 w-full rounded-xl bg-amber-400 font-semibold text-slate-900 hover:bg-amber-500"
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
          className="flex w-full items-center justify-between rounded-lg pt-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Открыть подробности недели
          <ChevronRight className="h-4 w-4" />
        </button>
      </CardContent>
    </Card>
  )
}
