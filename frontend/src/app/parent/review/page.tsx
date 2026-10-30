// frontend/src/app/parent/review/page.tsx
"use client"

import { useState } from "react"
import { parentApi } from "@/services/parentApi"
import { useChildren } from "@/hooks/useChildren"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useLogSyncStore } from "@/store/useLogSyncStore"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import { ParentReviewCard } from "@/components/ParentReviewCard"
import { LogStatus } from "@/components/LogStatusEditor"
import { Button } from "@/components/ui/button"

const WEEK_DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]

// ─── ВРЕМЕННЫЙ ФЛАГ ДЛЯ ОТЛАДКИ ────────────────────────────────
// Поставьте false или удалите блок целиком, когда закончите.
const DEBUG_RAW = true

export default function ParentReviewPage() {
  const [selectedChildId, setSelectedChildId] = useState<string>("ALL")
  const [activeTaskView, setActiveTaskView] = useState<WeeklyReviewItem | null>(null)

  const { children, isLoading: childrenLoading } = useChildren()
  const queryClient = useQueryClient()
  const { queueChange } = useLogSyncStore()

  const {
    data: reviewsData = [],
    isLoading: reviewsLoading,
    error,
  } = useQuery({
    queryKey: ["weekly-review", selectedChildId],
    queryFn: async () => {
      let result: any
      if (selectedChildId === "ALL") {
        if (children.length === 0) return []
        const promises = children.map((child: any) => parentApi.getWeeklyReview(child.id))
        const results = await Promise.all(promises)
        result = results.flat()
      } else {
        const data = await parentApi.getWeeklyReview(Number(selectedChildId))
        result = Array.isArray(data) ? data : []
      }

      // ─── ВРЕМЕННЫЙ ЛОГ ────────────────────────────────────────
      if (DEBUG_RAW) {
        console.group(`[weekly-review] child=${selectedChildId}`)
        console.log("raw:", result)
        if (Array.isArray(result)) {
          console.table(
            result.map((item: any) => ({
              taskId: item.taskId,
              title: item.title,
              scheduleType: item.scheduleType,
              weeklyPrice: item.weeklyPrice,
              targetCount: item.targetCount,
              targetDays: JSON.stringify(item.targetDays),
              approved: item.summary?.approvedCount,
              pending: item.summary?.pendingCount,
              rejected: item.summary?.rejectedCount,
              calcAmount: item.summary?.calculatedAmount,
              logsCount: item.logs?.length,
            })),
          )
          result.forEach((item: any) => {
            console.group(`task ${item.taskId} · ${item.title}`)
            console.log("summary:", item.summary)
            console.table(
              (item.logs || []).map((l: any) => ({
                id: l.id,
                date: l.date,
                status: l.status,
                earned_amount: l.earned_amount,
              })),
            )
            console.groupEnd()
          })
        }
        console.groupEnd()
      }

      return result
    },
    enabled: !childrenLoading && children.length > 0,
  })

  if (DEBUG_RAW && error) {
    console.error("[weekly-review] query error:", error)
  }

  const loading = childrenLoading || reviewsLoading

  const handleApprove = async (logId: number) => {
    try {
      await parentApi.bulkApproveLogs([logId])
      queryClient.invalidateQueries({ queryKey: ["weekly-review"] })
    } catch (error) {
      console.error("Ошибка подтверждения:", error)
    }
  }

  const handleApproveAll = async (logIds: number[]) => {
    try {
      await parentApi.bulkApproveLogs(logIds)
      queryClient.invalidateQueries({ queryKey: ["weekly-review"] })
    } catch (error) {
      console.error("Ошибка массового подтверждения:", error)
    }
  }

  const handleChangeLogStatus = async (
    logId: number | null,
    status: LogStatus,
    taskId?: number,
    date?: string,
  ) => {
    if (!taskId || !date) return

    const updateCache = (oldData: any) => {
      if (!oldData) return oldData
      return oldData.map((item: WeeklyReviewItem) => {
        if (item.taskId !== taskId) return item

        const existingLogIndex = item.logs.findIndex((l) => l.date === date)
        let updatedLogs = [...item.logs]
        let pricePerRun =
          Number(item.weeklyPrice) / (item.targetCount || item.targetDays?.length || 1)
        let oldStatus = existingLogIndex >= 0 ? item.logs[existingLogIndex].status : "NONE"

        const earnedAmount = status === "CANCELLED" || status === "REJECTED" ? 0 : pricePerRun

        if (existingLogIndex >= 0) {
          updatedLogs[existingLogIndex] = {
            ...updatedLogs[existingLogIndex],
            status,
            earned_amount: earnedAmount,
          }
        } else {
          updatedLogs.push({ id: Date.now(), date, status, earned_amount: earnedAmount })
        }

        let currentAmount = Number(item.summary.calculatedAmount || 0)
        if (oldStatus !== "APPROVED" && status === "APPROVED") currentAmount += pricePerRun
        if (oldStatus === "APPROVED" && status !== "APPROVED") currentAmount -= pricePerRun

        return {
          ...item,
          summary: { ...item.summary, calculatedAmount: Math.max(0, currentAmount).toFixed(2) },
          logs: updatedLogs,
        }
      })
    }

    queryClient.setQueryData(["weekly-review", selectedChildId], updateCache)

    if (activeTaskView && activeTaskView.taskId === taskId) {
      setActiveTaskView((prev) => (prev ? updateCache([prev])[0] : prev))
    }

    queueChange({ logId, taskId, date, status }, queryClient)
  }

  const formatMoney = (amount: string | number) =>
    new Intl.NumberFormat("ru-RU", {
      maximumFractionDigits: 2,
    }).format(Number(amount)) + " ₽"

  function formatDate(dateObj: Date) {
    const year = dateObj.getFullYear()
    const month = String(dateObj.getMonth() + 1).padStart(2, "0")
    const day = String(dateObj.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const getLogEditorInfo = () => ({
    changedBy: "Родитель",
    changedAt: "Недавно",
  })

  if (activeTaskView) {
    const startDate = new Date(`${activeTaskView.weekStart || "2025-10-20"}T12:00:00`)
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
    const activeLogs = Array.isArray(activeTaskView.logs) ? activeTaskView.logs : []
    const scheduledDays = activeTaskView.targetDays ?? []

    return (
      <div className="flex flex-col gap-6 pb-20">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setActiveTaskView(null)}
            className="flex cursor-pointer items-center gap-1 text-base font-bold text-slate-900 transition-colors hover:text-amber-600"
          >
            <ChevronLeft className="h-5 w-5" />
            {activeTaskView.title}
          </button>

          <Badge variant="secondary" className="bg-amber-100 text-xs text-amber-800">
            Проверка
          </Badge>
        </div>

        {/* ─── ВРЕМЕННЫЙ ДАМП activeTaskView ─────────────────────── */}
        {DEBUG_RAW && (
          <details className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs">
            <summary className="cursor-pointer font-semibold text-rose-800">
              [DEBUG] activeTaskView JSON
            </summary>
            <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-all">
              {JSON.stringify(activeTaskView, null, 2)}
            </pre>
          </details>
        )}

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="flex flex-col gap-4 p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={activeTaskView.child.avatar} />
                <AvatarFallback>{(activeTaskView.child.name || "Р").slice(0, 1)}</AvatarFallback>
              </Avatar>

              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-900">
                  {activeTaskView.child.name}
                </span>

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
            const editorInfo = getLogEditorInfo()

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
                        Изменил: {editorInfo.changedBy}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <Clock3 className="h-3 w-3" />
                        Когда: {editorInfo.changedAt}
                      </div>
                    </div>
                  )}

                  {isPending && (
                    <div className="flex gap-2 pt-1">
                      <Button
                        variant="secondary"
                        className="h-10 flex-1 cursor-pointer bg-slate-100 font-semibold text-rose-600 hover:bg-slate-200"
                        onClick={() => {
                          handleChangeLogStatus(
                            log.id,
                            "REJECTED",
                            activeTaskView.taskId,
                            log.date,
                          ).catch((error) => console.error("Ошибка отклонения:", error))
                        }}
                      >
                        <X className="mr-1 h-4 w-4" />
                        Отклонить
                      </Button>

                      <Button
                        className="h-10 flex-1 cursor-pointer bg-amber-400 font-semibold text-slate-900 hover:bg-amber-500"
                        onClick={() => handleApprove(log.id)}
                      >
                        <CheckCircle2 className="mr-1 h-4 w-4" />
                        Подтвердить
                      </Button>
                    </div>
                  )}

                  {isCancelled && (
                    <Button
                      variant="outline"
                      className="mt-1 h-10 w-full cursor-pointer border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      onClick={() => {
                        handleChangeLogStatus(
                          log.id,
                          "APPROVED",
                          activeTaskView.taskId,
                          log.date,
                        ).catch((error) => console.error("Ошибка восстановления:", error))
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

  return (
    <div className="flex flex-col gap-6 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Проверка заданий</h1>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setSelectedChildId("ALL")}
          className={cn(
            "cursor-pointer whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all",
            selectedChildId === "ALL"
              ? "bg-slate-900 text-white shadow-xs"
              : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
          )}
        >
          Все дети
        </button>

        {children.map((child: any) => (
          <button
            key={child.id}
            type="button"
            onClick={() => setSelectedChildId(String(child.id))}
            className={cn(
              "cursor-pointer whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all",
              selectedChildId === String(child.id)
                ? "bg-slate-900 text-white shadow-xs"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            )}
          >
            {child.first_name || child.name || "Ребенок"}
          </button>
        ))}
      </div>

      {/* ─── ВРЕМЕННЫЙ ДАМП reviewsData НА СТРАНИЦЕ ─────────────── */}
      {DEBUG_RAW && (
        <details open className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs">
          <summary className="cursor-pointer font-semibold text-rose-800">
            [DEBUG] weekly-review: {Array.isArray(reviewsData) ? reviewsData.length : 0} item(s) ·
            queryKey=["weekly-review","{selectedChildId}"] · loading={String(reviewsLoading)}
          </summary>

          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded bg-white px-2 py-1 text-[11px] font-medium text-rose-700 ring-1 ring-rose-200"
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(reviewsData, null, 2))
              }}
            >
              Скопировать JSON
            </button>
            <button
              type="button"
              className="rounded bg-white px-2 py-1 text-[11px] font-medium text-rose-700 ring-1 ring-rose-200"
              onClick={() => {
                const cached = queryClient.getQueryData(["weekly-review", selectedChildId])
                console.log("[cached]", cached)
                alert("См. console.log → [cached]")
              }}
            >
              Кэш в консоль
            </button>
            <button
              type="button"
              className="rounded bg-white px-2 py-1 text-[11px] font-medium text-rose-700 ring-1 ring-rose-200"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["weekly-review"] })
              }}
            >
              Инвалидировать
            </button>
          </div>

          <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap break-all text-[11px] leading-tight">
            {JSON.stringify(reviewsData, null, 2)}
          </pre>
        </details>
      )}

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-500">Загрузка заданий...</div>
      ) : reviewsData.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-500">Нет заданий на проверку</div>
      ) : (
        <div className="flex flex-col gap-4">
          {reviewsData.map((item: WeeklyReviewItem) => (
            <ParentReviewCard
              key={`${item.taskId}-${item.weekStart}`}
              item={item}
              onApproveLog={handleApprove}
              onApproveAll={handleApproveAll}
              onOpenDetail={(rev) => setActiveTaskView(rev)}
              onChangeLogStatus={handleChangeLogStatus}
            />
          ))}
        </div>
      )}
    </div>
  )
}
