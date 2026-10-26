// src/app/parent/review/page.tsx
"use client"

import { useEffect, useState } from "react"
import { parentApi } from "@/services/parentApi"
import { useChildren } from "@/hooks/useChildren"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { Check, Clock3, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react"
import { WeeklyReviewItem } from "@/types/props"
import { ParentReviewCard } from "@/components/ParentReviewCard"

const WEEK_DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]

export default function ParentReviewPage() {
  const [selectedChildId, setSelectedChildId] = useState<string>("ALL")
  const [activeTaskView, setActiveTaskView] = useState<WeeklyReviewItem | null>(null)
  const [reviewsData, setReviewsData] = useState<WeeklyReviewItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const { children, isLoading: childrenLoading } = useChildren()

  const fetchWeeklyReviews = async () => {
    try {
      setLoading(true)
      if (selectedChildId === "ALL") {
        if (children.length === 0) {
          setReviewsData([])
          return
        }
        const promises = children.map((child: any) => parentApi.getWeeklyReview(child.id))
        const results = await Promise.all(promises)
        const flattened = results.flat()
        setReviewsData(flattened)
      } else {
        const data = await parentApi.getWeeklyReview(Number(selectedChildId))
        setReviewsData(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error("Ошибка загрузки недельного обзора:", error)
      setReviewsData([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!childrenLoading) {
      fetchWeeklyReviews()
    }
  }, [selectedChildId, children])

  const handleApprove = async (logId: number) => {
    try {
      await parentApi.bulkApproveLogs([logId])
      fetchWeeklyReviews()
    } catch (error) {
      console.error("Ошибка подтверждения:", error)
    }
  }

  const handleApproveAll = async (logIds: number[]) => {
    try {
      await parentApi.bulkApproveLogs(logIds)
      fetchWeeklyReviews()
    } catch (error) {
      console.error("Ошибка массового подтверждения:", error)
    }
  }

  const formatMoney = (amount: string | number) =>
    new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(Number(amount)) + " ₽"

  if (activeTaskView) {
    const startDate = new Date(`${activeTaskView.weekStart || "2025-10-20"}T12:00:00`)
    const weekDates = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(startDate)
      date.setDate(date.getDate() + index)
      return date
    })
    const weekEnd = weekDates[6]
    const weekLabel = `${weekDates[0].getDate()}–${weekEnd.getDate()} ${weekEnd.toLocaleDateString("ru-RU", { month: "long" })}`
    const activeLogs = Array.isArray(activeTaskView.logs) ? activeTaskView.logs : []

    return (
      <div className="flex flex-col gap-6 pb-16">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setActiveTaskView(null)}
            className="flex items-center gap-1 text-base font-bold text-slate-900 hover:text-amber-600 transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-5 w-5" />
            {activeTaskView.title}
          </button>
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-xs">
            Проверка
          </Badge>
        </div>

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

            <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Неделя</span>
                <span className="font-medium text-slate-800">{weekLabel}</span>
              </div>

              <div className="grid grid-cols-7 gap-1 pt-1">
                {weekDates.map((date, idx) => {
                  const log = activeLogs.find((l) => l.date === formatDate(date, idx)) // упрощено далее под логику дат
                  const status = log?.status ?? "PENDING"
                  const isDone = status === "APPROVED"
                  const isPending = status === "DONE"

                  return (
                    <div key={idx} className="flex flex-col items-center gap-1 py-1">
                      <span className="text-[10px] text-slate-400">{WEEK_DAYS[idx]}</span>
                      <div
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                          isDone && "bg-emerald-100 text-emerald-700",
                          isPending && "bg-amber-200 text-amber-900",
                          !isDone && !isPending && "bg-slate-100 text-slate-400",
                        )}
                      >
                        {isDone ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : isPending ? (
                          <Clock3 className="h-3.5 w-3.5" />
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
          <span className="text-xs font-semibold text-slate-700 px-1">Выполнения за неделю</span>

          {activeLogs.map((log) => {
            const isPending = log.status === "DONE"
            const isApproved = log.status === "APPROVED"
            const logDate = new Date(`${log.date}T12:00:00`)
            const dayNameStr = logDate.toLocaleDateString("ru-RU", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })

            return (
              <Card
                key={log.id}
                className={cn(
                  "border-slate-200 shadow-xs",
                  isPending && "bg-amber-50/40 border-amber-200",
                  isApproved && "bg-emerald-50/30 border-emerald-200",
                )}
              >
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-bold text-slate-900 capitalize">
                        {dayNameStr}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {isPending ? "Отмечено ребёнком" : "Подтверждено родителем"}
                      </span>
                    </div>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[10px]",
                        isPending && "bg-amber-100 text-amber-800",
                        isApproved && "bg-emerald-100 text-emerald-800",
                      )}
                    >
                      {isPending ? "Ожидает" : "Подтверждено"}
                    </Badge>
                  </div>

                  <span className="text-base font-extrabold text-slate-900">
                    {formatMoney(log.earned_amount || 0)}
                  </span>

                  {isPending && (
                    <div className="flex gap-2 pt-1">
                      <Button
                        variant="secondary"
                        className="flex-1 bg-slate-100 text-rose-600 hover:bg-slate-200 font-semibold h-10 cursor-pointer"
                      >
                        Отклонить
                      </Button>
                      <Button
                        className="flex-1 bg-amber-400 text-slate-900 hover:bg-amber-500 font-semibold h-10 cursor-pointer"
                        onClick={() => handleApprove(log.id)}
                      >
                        Подтвердить
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    )
  }

  function formatDate(dateObj: Date, _idx: number) {
    const year = dateObj.getFullYear()
    const month = String(dateObj.getMonth() + 1).padStart(2, "0")
    const day = String(dateObj.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  return (
    <div className="flex flex-col gap-6 pb-16">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Проверка заданий</h1>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedChildId("ALL")}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
            selectedChildId === "ALL"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50",
          )}
        >
          Все дети
        </button>
        {children.map((child: any) => (
          <button
            key={child.id}
            onClick={() => setSelectedChildId(String(child.id))}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
              selectedChildId === String(child.id)
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50",
            )}
          >
            {child.first_name || child.name || "Ребенок"}
          </button>
        ))}
      </div>

      {loading || childrenLoading ? (
        <div className="py-12 text-center text-sm text-slate-500">Загрузка заданий...</div>
      ) : reviewsData.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-500">Нет заданий на проверку</div>
      ) : (
        <div className="flex flex-col gap-4">
          {reviewsData.map((item) => (
            <ParentReviewCard
              key={item.taskId}
              item={item}
              onApproveLog={handleApprove}
              onApproveAll={handleApproveAll}
              onOpenDetail={(rev) => setActiveTaskView(rev)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
