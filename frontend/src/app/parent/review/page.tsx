// frontend/src/app/parent/review/page.tsx
"use client"

import { useMemo, useState } from "react"
import { parentApi } from "@/services/parentApi"
import { useChildren } from "@/hooks/useChildren"
import { useRequireRole } from "@/hooks/useRequireRole"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useLogSyncStore } from "@/store/useLogSyncStore"
import { WeeklyReviewItem } from "@/types/props"
import { ParentReviewCard } from "@/components/ParentReviewCard"
import { LogStatus } from "@/components/LogStatusEditor"
import { WeekNavigator } from "@/components/WeekNavigator"
import { ChildFilter } from "@/components/parent/ChildFilter"
import { getMonday, addWeeks, toISODate, getWeekEnd } from "@/lib/week"
import { ReviewTaskDetail } from "@/components/parent/ReviewTaskDetail"

const DEBUG_RAW = false

function normalizeDays(days?: number[] | string[]): number[] {
  if (!Array.isArray(days)) return []
  return days
    .map((d) => {
      if (typeof d === "number") return d
      const map: Record<string, number> = {
        mon: 1,
        tue: 2,
        wed: 3,
        thu: 4,
        fri: 5,
        sat: 6,
        sun: 7,
      }
      return map[String(d).toLowerCase()] ?? 0
    })
    .filter((d): d is number => d >= 1 && d <= 7)
}

/** Приводит ответ бэка к безопасному для UI виду */
function normalizeReview(item: any): WeeklyReviewItem {
  return {
    ...item,
    weeklyPrice: item.weeklyPrice ?? 0,
    targetDays: normalizeDays(item.targetDays),
    targetCount: item.targetCount ?? 0,
    logs: Array.isArray(item.logs) ? item.logs : [],
    summary: item.summary ?? {
      approvedCount: 0,
      pendingCount: 0,
      rejectedCount: 0,
      calculatedAmount: 0,
    },
  }
}

export default function ParentReviewPage() {
  const { ready } = useRequireRole("PARENT")

  const [selectedChildId, setSelectedChildId] = useState<string>("ALL")
  const [activeTaskView, setActiveTaskView] = useState<WeeklyReviewItem | null>(null)
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()))

  const weekStartIso = toISODate(weekStart)
  const weekEndIso = toISODate(getWeekEnd(weekStart))

  const { children, isLoading: childrenLoading } = useChildren()
  const queryClient = useQueryClient()
  const { queueChange } = useLogSyncStore()

  const {
    data: reviewsData = [],
    isLoading: reviewsLoading,
    error,
  } = useQuery<WeeklyReviewItem[]>({
    queryKey: ["weekly-review", selectedChildId, weekStartIso],
    enabled: ready && !childrenLoading && children.length > 0,
    queryFn: async () => {
      let raw: any[]
      if (selectedChildId === "ALL") {
        const results = await Promise.all(
          children.map((child: any) => parentApi.getWeeklyReview(child.id, weekStartIso)),
        )
        raw = results.flat()
      } else {
        const data = await parentApi.getWeeklyReview(Number(selectedChildId), weekStartIso)
        raw = Array.isArray(data) ? data : []
      }

      const normalized = raw.map(normalizeReview)

      if (DEBUG_RAW) {
        console.group(`[weekly-review] child=${selectedChildId} week=${weekStartIso}`)
        console.log("raw:", raw)
        if (Array.isArray(normalized)) {
          console.table(
            normalized.map((item) => ({
              taskId: item.taskId,
              title: item.title,
              scheduleType: item.scheduleType,
              weeklyPrice: item.weeklyPrice,
              targetCount: item.targetCount,
              targetDays: JSON.stringify(item.targetDays),
              approved: item.summary.approvedCount,
              pending: item.summary.pendingCount,
              rejected: item.summary.rejectedCount,
              calcAmount: item.summary.calculatedAmount,
              logsCount: item.logs.length,
              weekClosed: item.weekClosed,
            })),
          )
        }
        console.groupEnd()
      }

      return normalized
    },
  })

  if (DEBUG_RAW && error) {
    console.error("[weekly-review] query error:", error)
  }

  const loading = childrenLoading || reviewsLoading

  const nextDisabled = useMemo(() => {
    const currentMonday = getMonday(new Date())
    return weekStart >= currentMonday
  }, [weekStart])

  const handlePrev = () => {
    setActiveTaskView(null)
    setWeekStart((d) => addWeeks(d, -1))
  }
  const handleNext = () => {
    if (!nextDisabled) {
      setActiveTaskView(null)
      setWeekStart((d) => addWeeks(d, 1))
    }
  }

  const invalidateCurrentWeek = () => {
    queryClient.invalidateQueries({
      queryKey: ["weekly-review", selectedChildId, weekStartIso],
    })
  }

  const handleApprove = async (logId: number) => {
    try {
      await parentApi.bulkApproveLogs([logId])
      invalidateCurrentWeek()
    } catch (error: any) {
      const detail = error?.response?.data?.detail || error?.response?.data?.error
      if (error?.response?.status === 400 && detail) {
        alert(detail)
      }
      console.error("Ошибка подтверждения:", error)
    }
  }

  const handleApproveAll = async (logIds: number[]) => {
    try {
      await parentApi.bulkApproveLogs(logIds)
      invalidateCurrentWeek()
    } catch (error: any) {
      const detail = error?.response?.data?.detail || error?.response?.data?.error
      if (error?.response?.status === 400 && detail) {
        alert(detail)
      }
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

    const cached = queryClient.getQueryData<WeeklyReviewItem[]>([
      "weekly-review",
      selectedChildId,
      weekStartIso,
    ])
    const currentItem = cached?.find((it) => it.taskId === taskId)
    if (currentItem?.weekClosed) {
      console.warn("[review] week is closed, ignoring status change")
      return
    }

    const updateCache = (oldData: any) => {
      if (!oldData) return oldData
      return (oldData as WeeklyReviewItem[]).map((item) => {
        if (item.taskId !== taskId) return item
        if (item.weekClosed) return item

        const existingLogIndex = item.logs.findIndex((l) => l.date === date)
        const updatedLogs = [...item.logs]
        const runs = item.targetCount || item.targetDays.length || 1
        const pricePerRun = Number(item.weeklyPrice) / runs
        const oldStatus = existingLogIndex >= 0 ? item.logs[existingLogIndex].status : "NONE"

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
          summary: {
            ...item.summary,
            calculatedAmount: Math.max(0, currentAmount).toFixed(2),
          },
          logs: updatedLogs,
        }
      })
    }

    queryClient.setQueryData(["weekly-review", selectedChildId, weekStartIso], updateCache)

    if (activeTaskView && activeTaskView.taskId === taskId) {
      setActiveTaskView((prev) => (prev ? updateCache([prev])[0] : prev))
    }

    queueChange({ logId, taskId, date, status }, queryClient)
  }

  if (!ready) {
    return <div className="py-12 text-center text-sm text-slate-500">Загрузка...</div>
  }

  if (activeTaskView) {
    return (
      <ReviewTaskDetail
        item={activeTaskView}
        onBack={() => setActiveTaskView(null)}
        onApprove={handleApprove}
        onChangeLogStatus={handleChangeLogStatus}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Проверка заданий</h1>
      </div>

      <WeekNavigator
        weekStart={weekStartIso}
        weekEnd={weekEndIso}
        onPrev={handlePrev}
        onNext={handleNext}
        disableNext={nextDisabled}
      />

      <ChildFilter
        children={children}
        selectedChildId={selectedChildId}
        onChange={setSelectedChildId}
      />

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-500">Загрузка заданий...</div>
      ) : reviewsData.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-500">Нет заданий на проверку</div>
      ) : (
        <div className="flex flex-col gap-4">
          {reviewsData.map((item) => (
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
