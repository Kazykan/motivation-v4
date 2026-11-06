"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Check,
  Clock3,
  ChevronLeft,
  X,
  CheckCircle2,
  UserRound,
  RotateCcw,
  Trash2,
} from "lucide-react"
import { LogStatusValue, WeeklyReviewItem } from "@/types/props"
import { WEEK_DAYS_SHORT, formatDateISO, formatLongDay } from "@/lib/dates"
import { formatMoney } from "@/lib/money"

interface ReviewTaskDetailProps {
  item: WeeklyReviewItem
  onBack: () => void
  onApprove: (logId: number) => void
  onChangeLogStatus: (
    logId: number | null,
    status: LogStatusValue,
    taskId?: number,
    date?: string,
  ) => Promise<void>
}

export function ReviewTaskDetail({
  item,
  onBack,
  onApprove,
  onChangeLogStatus,
}: ReviewTaskDetailProps) {
  const weekClosed = !!item.weekClosed
  const startDate = new Date(`${item.weekStart || "2025-10-20"}T12:00:00`)
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    return d
  })
  const weekEnd = weekDates[6]
  const weekLabel = `${weekDates[0].getDate()}–${weekEnd.getDate()} ${weekEnd.toLocaleDateString(
    "ru-RU",
    { month: "long" },
  )}`

  const activeLogs = Array.isArray(item.logs) ? item.logs : []
  const scheduledDays = item.targetDays ?? []

  return (
    <div className="flex flex-col gap-6 pb-20">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex cursor-pointer items-center gap-1 text-base font-bold text-brand-dark transition-colors hover:text-brand-primary-hover"
        >
          <ChevronLeft className="h-5 w-5" />
          {item.title}
        </button>

        <Badge
          variant="secondary"
          className={cn(
            "text-xs",
            weekClosed
              ? "bg-brand-success-soft text-brand-success-strong"
              : "bg-brand-warning-soft text-brand-warning-strong",
          )}
        >
          {weekClosed ? "Неделя закрыта" : "Проверка"}
        </Badge>
      </div>

      <Card className="border-brand-muted/20 bg-white shadow-xs">
        <CardContent className="flex flex-col gap-4 p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={item.child.avatar} />
              <AvatarFallback>{(item.child.name || "Р").slice(0, 1)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-brand-dark">{item.child.name}</span>
              <span className="text-xs text-brand-muted">{weekLabel}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-brand-muted/15 pt-2">
            <div className="flex items-center justify-between text-xs text-brand-muted">
              <span>Неделя</span>
              <span className="font-medium text-brand-dark">{weekLabel}</span>
            </div>

            <div className="grid grid-cols-7 gap-1 pt-1">
              {weekDates.map((date, idx) => {
                const formattedDate = formatDateISO(date)
                const log = activeLogs.find((l) => l.date === formattedDate)
                const status = log?.status ?? "NONE"
                const isApproved = status === "APPROVED"
                const isPending = status === "DONE"
                const isRejected = status === "REJECTED"
                const isCancelled = status === "CANCELLED"
                const isScheduled = scheduledDays.includes(idx + 1)

                return (
                  <div key={formattedDate} className="flex flex-col items-center gap-1 py-1">
                    <span className="text-[10px] text-brand-muted">{WEEK_DAYS_SHORT[idx]}</span>
                    <div
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                        isApproved && "bg-brand-success-soft text-brand-success-strong",
                        isPending && "bg-brand-primary-soft text-brand-warning-strong",
                        isRejected && "bg-brand-error-soft text-brand-error-strong",
                        isCancelled && "bg-brand-surface-alt text-brand-muted",
                        isScheduled && !log && "border border-brand-primary text-brand-dark",
                        !isScheduled && !log && "text-brand-muted/40",
                      )}
                    >
                      {isApproved ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : isPending ? (
                        <Clock3 className="h-3.5 w-3.5" />
                      ) : isRejected ? (
                        <X className="h-3.5 w-3.5" />
                      ) : isCancelled ? (
                        <Trash2 className="h-3.5 w-3.5" />
                      ) : (
                        date.getDate()
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {weekClosed && (
        <div className="rounded-lg border border-brand-success bg-brand-success-soft p-2.5 text-[11px] text-brand-success-strong">
          Неделя закрыта и выплачена. Изменять отметки нельзя.
        </div>
      )}

      <div className="flex flex-col gap-3">
        <span className="px-1 text-xs font-semibold text-brand-dark">Выполнения за неделю</span>

        {activeLogs.map((log) => {
          const isPending = log.status === "DONE"
          const isApproved = log.status === "APPROVED"
          const isRejected = log.status === "REJECTED"
          const isCancelled = log.status === "CANCELLED"
          const statusLabel = isPending
            ? "Ожидает"
            : isApproved
              ? "Подтверждено"
              : isRejected
                ? "Отклонено"
                : isCancelled
                  ? "Удалено"
                  : "Неизвестный статус"

          return (
            <Card
              key={log.id}
              className={cn(
                "border-brand-muted/20 shadow-xs",
                isPending && "border-brand-warning/40 bg-brand-warning-soft/40",
                isApproved && "border-brand-success/30 bg-brand-success-soft/30",
                isRejected && "border-brand-error/30 bg-brand-error-soft/40",
                isCancelled && "border-brand-muted/20 bg-brand-surface-alt/60",
              )}
            >
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold capitalize text-brand-dark">
                      {formatLongDay(log.date)}
                    </span>
                    <span className="text-[11px] text-brand-muted">
                      {isPending
                        ? "Отмечено ребёнком"
                        : isApproved
                          ? "Подтверждено родителем"
                          : isRejected
                            ? "Отклонено родителем"
                            : isCancelled
                              ? "Отметка удалена (история сохранена)"
                              : "Статус не определён"}
                    </span>
                  </div>

                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px]",
                      isPending && "bg-brand-warning-soft text-brand-warning-strong",
                      isApproved && "bg-brand-success-soft text-brand-success-strong",
                      isRejected && "bg-brand-error-soft text-brand-error-strong",
                      isCancelled && "bg-brand-surface-alt text-brand-muted",
                    )}
                  >
                    {isPending ? (
                      <Clock3 className="mr-1 h-3 w-3" />
                    ) : isApproved ? (
                      <Check className="mr-1 h-3 w-3" />
                    ) : isRejected ? (
                      <X className="mr-1 h-3 w-3" />
                    ) : isCancelled ? (
                      <Trash2 className="mr-1 h-3 w-3" />
                    ) : null}
                    {statusLabel}
                  </Badge>
                </div>

                <span
                  className={cn(
                    "text-base font-extrabold",
                    isCancelled ? "text-brand-muted line-through" : "text-brand-dark",
                  )}
                >
                  {formatMoney(log.earned_amount ?? 0)}
                </span>

                {!isPending && (
                  <div className="flex flex-col gap-1 border-t border-brand-muted/15 pt-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-brand-muted">
                      <UserRound className="h-3 w-3" />
                      Изменил: Родитель
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-brand-muted">
                      <Clock3 className="h-3 w-3" />
                      Когда: Недавно
                    </div>
                  </div>
                )}

                {isPending && !weekClosed && (
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="secondary"
                      className="h-10 flex-1 cursor-pointer bg-brand-surface-alt font-semibold text-brand-error hover:bg-brand-error-soft"
                      onClick={() => {
                        onChangeLogStatus(log.id, "REJECTED", item.taskId, log.date).catch((e) =>
                          console.error("Ошибка отклонения:", e),
                        )
                      }}
                    >
                      <X className="mr-1 h-4 w-4" />
                      Отклонить
                    </Button>

                    <Button
                      className="h-10 flex-1 cursor-pointer bg-brand-primary font-semibold text-brand-dark hover:bg-brand-primary-hover"
                      onClick={() => onApprove(log.id)}
                    >
                      <CheckCircle2 className="mr-1 h-4 w-4" />
                      Подтвердить
                    </Button>
                  </div>
                )}

                {isCancelled && !weekClosed && (
                  <Button
                    variant="outline"
                    className="mt-1 h-10 w-full cursor-pointer border-brand-success/30 text-brand-success-strong hover:bg-brand-success-soft"
                    onClick={() => {
                      onChangeLogStatus(log.id, "APPROVED", item.taskId, log.date).catch((e) =>
                        console.error("Ошибка восстановления:", e),
                      )
                    }}
                  >
                    <RotateCcw className="mr-1 h-4 w-4" />
                    Восстановить
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
