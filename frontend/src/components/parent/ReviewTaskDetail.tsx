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
import { WeeklyReviewItem } from "@/types/props"
import { LogStatus } from "@/components/LogStatusEditor"

const WEEK_DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]

interface ReviewTaskDetailProps {
  item: WeeklyReviewItem
  onBack: () => void
  onApprove: (logId: number) => void
  onChangeLogStatus: (
    logId: number | null,
    status: LogStatus,
    taskId?: number,
    date?: string,
  ) => Promise<void>
}

function formatDate(dateObj: Date) {
  const y = dateObj.getFullYear()
  const m = String(dateObj.getMonth() + 1).padStart(2, "0")
  const d = String(dateObj.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function formatMoney(amount: string | number) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(Number(amount)) + " ₽"
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
          className="flex cursor-pointer items-center gap-1 text-base font-bold text-slate-900 transition-colors hover:text-amber-600"
        >
          <ChevronLeft className="h-5 w-5" />
          {item.title}
        </button>

        <Badge
          variant="secondary"
          className={cn(
            "text-xs",
            weekClosed ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800",
          )}
        >
          {weekClosed ? "Неделя закрыта" : "Проверка"}
        </Badge>
      </div>

      <Card className="border-slate-200 bg-white shadow-xs">
        <CardContent className="flex flex-col gap-4 p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={item.child.avatar} />
              <AvatarFallback>{(item.child.name || "Р").slice(0, 1)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-900">{item.child.name}</span>
              <span className="text-xs text-slate-500">{weekLabel}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-slate-100 pt-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Неделя</span>
              <span className="font-medium text-slate-800">{weekLabel}</span>
            </div>

            <div className="grid grid-cols-7 gap-1 pt-1">
              {weekDates.map((date, idx) => {
                const formattedDate = formatDate(date)
                const log = activeLogs.find((l) => l.date === formattedDate)
                const status = log?.status ?? "NONE"
                const isApproved = status === "APPROVED"
                const isPending = status === "DONE"
                const isRejected = status === "REJECTED"
                const isCancelled = status === "CANCELLED"
                const isScheduled = scheduledDays.includes(idx + 1)

                return (
                  <div key={formattedDate} className="flex flex-col items-center gap-1 py-1">
                    <span className="text-[10px] text-slate-400">{WEEK_DAYS[idx]}</span>
                    <div
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                        isApproved && "bg-emerald-100 text-emerald-700",
                        isPending && "bg-amber-200 text-amber-900",
                        isRejected && "bg-red-100 text-red-700",
                        isCancelled && "bg-slate-100 text-slate-400",
                        isScheduled && !log && "border border-amber-300 text-slate-700",
                        !isScheduled && !log && "text-slate-300",
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
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-[11px] text-emerald-800">
          Неделя закрыта и выплачена. Изменять отметки нельзя.
        </div>
      )}

      <div className="flex flex-col gap-3">
        <span className="px-1 text-xs font-semibold text-slate-700">Выполнения за неделю</span>

        {activeLogs.map((log) => {
          const isPending = log.status === "DONE"
          const isApproved = log.status === "APPROVED"
          const isRejected = log.status === "REJECTED"
          const isCancelled = log.status === "CANCELLED"
          const logDate = new Date(`${log.date}T12:00:00`)
          const dayNameStr = logDate.toLocaleDateString("ru-RU", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })
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
                "border-slate-200 shadow-xs",
                isPending && "border-amber-200 bg-amber-50/40",
                isApproved && "border-emerald-200 bg-emerald-50/30",
                isRejected && "border-red-200 bg-red-50/40",
                isCancelled && "border-slate-200 bg-slate-50/60",
              )}
            >
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold capitalize text-slate-900">
                      {dayNameStr}
                    </span>
                    <span className="text-[11px] text-slate-500">
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
                      isPending && "bg-amber-100 text-amber-800",
                      isApproved && "bg-emerald-100 text-emerald-800",
                      isRejected && "bg-red-100 text-red-800",
                      isCancelled && "bg-slate-200 text-slate-600",
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
                    isCancelled ? "text-slate-400 line-through" : "text-slate-900",
                  )}
                >
                  {formatMoney(log.earned_amount ?? 0)}
                </span>

                {!isPending && (
                  <div className="flex flex-col gap-1 border-t border-slate-200/70 pt-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <UserRound className="h-3 w-3" />
                      Изменил: Родитель
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <Clock3 className="h-3 w-3" />
                      Когда: Недавно
                    </div>
                  </div>
                )}

                {isPending && !weekClosed && (
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="secondary"
                      className="h-10 flex-1 cursor-pointer bg-slate-100 font-semibold text-rose-600 hover:bg-slate-200"
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
                      className="h-10 flex-1 cursor-pointer bg-amber-400 font-semibold text-slate-900 hover:bg-amber-500"
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
                    className="mt-1 h-10 w-full cursor-pointer border-emerald-200 text-emerald-700 hover:bg-emerald-50"
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
