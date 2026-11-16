"use client"

import { useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { parentApi } from "@/services/parentApi"
import { useChildren } from "@/hooks/useChildren"
import { useRouter } from "next/navigation"
import { WeekNavigator } from "@/components/WeekNavigator"
import { getMonday, addWeeks, toISODate, getWeekEnd } from "@/lib/week"
import type { WeeklyReportDraft } from "@/types/props"
import { useRequireRole } from "@/hooks/useRequireRole"
import { WeeklyReportCard, type WeeklyReportItem } from "@/components/parent/WeeklyReportCard"

export default function ParentReportsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { children, isLoading: childrenLoading } = useChildren()

  const [selectedChildId, setSelectedChildId] = useState<number | null>(null)
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()))
  const [closingKey, setClosingKey] = useState<string | null>(null)

  const weekStartIso = toISODate(weekStart)
  const weekEndIso = toISODate(getWeekEnd(weekStart))
  const { ready } = useRequireRole("PARENT")

  const { data: reports = [], isLoading: reportsLoading } = useQuery<WeeklyReportDraft[]>({
    queryKey: ["weekly-reports", selectedChildId, weekStartIso],
    queryFn: () => parentApi.getWeeklyReports(selectedChildId || undefined, weekStartIso),
    enabled: ready && !childrenLoading,
  })

  const closeWeekMutation = useMutation({
    mutationFn: (payload: {
      child_id: number
      week_start: string
      is_payout_confirmed: boolean
      manual_adjustment?: number
      comment?: string
    }) => parentApi.closeWeek(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weekly-reports"] })
      queryClient.invalidateQueries({ queryKey: ["weekly-review"] })
    },
    onSettled: () => {
      setClosingKey(null)
    },
  })

  const loading = childrenLoading || reportsLoading

  const nextDisabled = useMemo(() => {
    const currentMonday = getMonday(new Date())
    return weekStart >= currentMonday
  }, [weekStart])

  const handlePrev = () => setWeekStart((d) => addWeeks(d, -1))
  const handleNext = () => {
    if (!nextDisabled) setWeekStart((d) => addWeeks(d, 1))
  }

  const handleCloseWeek = (report: WeeklyReportItem) => {
    if (!report.can_close) return
    setClosingKey(`${report.child}-${report.start_date}`)
    closeWeekMutation.mutate({
      child_id: report.child,
      week_start: report.start_date,
      is_payout_confirmed: true,
      manual_adjustment: Number(report.manual_adjustment) || 0,
    })
  }

  const goToReview = (childId: number, weekStartIso: string) => {
    const params = new URLSearchParams()
    params.set("child_id", String(childId))
    params.set("week_start", weekStartIso)
    router.push(`/parent/review?${params.toString()}`)
  }

  if (!ready) {
    return <div className="py-12 text-center text-sm text-text-muted">Загрузка...</div>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-text-main">Недельные отчеты</h1>
      </div>

      <WeekNavigator
        weekStart={weekStartIso}
        weekEnd={weekEndIso}
        onPrev={handlePrev}
        onNext={handleNext}
        disableNext={nextDisabled}
      />

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setSelectedChildId(null)}
          className={`cursor-pointer whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
            selectedChildId === null
              ? "bg-brand-primary text-brand-dark shadow-xs"
              : "border border-app-surface bg-app-card text-text-muted hover:bg-app-surface"
          }`}
        >
          Все дети
        </button>
        {children.map((child: any) => (
          <button
            key={child.id}
            type="button"
            onClick={() => setSelectedChildId(child.id)}
            className={`cursor-pointer whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
              selectedChildId === child.id
                ? "bg-brand-primary text-brand-dark shadow-xs"
                : "border border-app-surface bg-app-card text-text-muted hover:bg-app-surface"
            }`}
          >
            {child.first_name || child.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-text-muted">Загрузка отчетов...</div>
      ) : reports.length === 0 ? (
        <div className="py-12 text-center text-sm text-text-muted">Нет доступных отчетов</div>
      ) : (
        <div className="flex flex-col gap-4">
          {reports.map((report) => {
            const childInfo = children.find((c: any) => c.id === report.child)
            const childName =
              [childInfo?.first_name, childInfo?.last_name].filter(Boolean).join(" ") ||
              childInfo?.name ||
              "Ребенок"
            const key = `${report.child}-${report.start_date}`

            return (
              <WeeklyReportCard
                key={key}
                report={report as WeeklyReportItem}
                childName={childName}
                childAvatar={childInfo?.avatar_url}
                onCloseWeek={handleCloseWeek}
                isClosing={closingKey === key && closeWeekMutation.isPending}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
