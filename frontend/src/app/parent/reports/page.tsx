"use client"

import { useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { parentApi } from "@/services/parentApi"
import { useChildren } from "@/hooks/useChildren"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { WeekNavigator } from "@/components/WeekNavigator"
import { getMonday, addWeeks, toISODate, getWeekEnd } from "@/lib/week"
import type { WeeklyReportDraft } from "@/types/props"
import { useRequireRole } from "@/hooks/useRequireRole"

export default function ParentReportsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { children, isLoading: childrenLoading } = useChildren()

  const [selectedChildId, setSelectedChildId] = useState<number | null>(null)
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()))

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

  const handleCloseWeek = (report: WeeklyReportDraft) => {
    if (!report.can_close) return
    closeWeekMutation.mutate({
      child_id: report.child,
      week_start: report.start_date,
      is_payout_confirmed: true,
    })
  }

  const goToReview = (childId: number, weekStartIso: string) => {
    const params = new URLSearchParams()
    params.set("child_id", String(childId))
    params.set("week_start", weekStartIso)
    router.push(`/parent/review?${params.toString()}`)
  }

  if (!ready) {
    return <div className="py-12 text-center text-sm text-brand-muted">Загрузка...</div>
  }

  return (
    <div className="flex flex-col gap-6 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-brand-dark">Недельные отчеты</h1>
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
              ? "bg-brand-dark text-white shadow-xs"
              : "border border-brand-muted/20 bg-white text-brand-muted hover:bg-brand-surface-alt"
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
                ? "bg-brand-dark text-white shadow-xs"
                : "border border-brand-muted/20 bg-white text-brand-muted hover:bg-brand-surface-alt"
            }`}
          >
            {child.first_name || child.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-brand-muted">Загрузка отчетов...</div>
      ) : reports.length === 0 ? (
        <div className="py-12 text-center text-sm text-brand-muted">Нет доступных отчетов</div>
      ) : (
        <div className="flex flex-col gap-4">
          {reports.map((report) => {
            const childInfo = children.find((c: any) => c.id === report.child)
            const isClosed = report.is_payout_confirmed || report.status === "CLOSED"
            const canClose = report.can_close && !isClosed

            return (
              <Card
                key={`${report.child}-${report.start_date}`}
                className="border-brand-muted/20 shadow-sm"
              >
                <CardHeader className="border-b border-brand-muted/15 pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary-soft font-bold text-brand-warning-strong">
                        {(childInfo?.first_name || childInfo?.name || "Р")?.[0]}
                      </div>
                      <div className="flex flex-col">
                        <CardTitle className="text-sm font-semibold text-brand-dark">
                          {childInfo?.first_name || childInfo?.name || "Ребенок"}
                        </CardTitle>
                        <span className="text-xs text-brand-muted">
                          Период: {report.start_date} – {report.end_date}
                        </span>
                      </div>
                    </div>
                    <Badge
                      className={
                        isClosed
                          ? "bg-brand-success-soft text-brand-success-strong"
                          : "bg-brand-warning-soft text-brand-warning-strong"
                      }
                    >
                      {isClosed ? "Выплачено" : "Ждет проверки"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 pt-4">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="flex flex-col">
                      <span className="text-brand-muted">Заработано</span>
                      <span className="font-bold text-brand-dark">
                        {report.calculated_amount} ₽
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-brand-muted">Корректировка</span>
                      <span className="font-bold text-brand-success">
                        +{report.manual_adjustment} ₽
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-brand-muted">Итого к выплате</span>
                      <span className="font-extrabold text-brand-dark">{report.final_sum} ₽</span>
                    </div>
                  </div>

                  {!isClosed && (
                    <div className="flex flex-col gap-2 pt-2">
                      <Button
                        variant="outline"
                        className="w-full cursor-pointer border-brand-warning/40 bg-brand-warning-soft/50 text-brand-warning-strong hover:bg-brand-warning-soft"
                        onClick={() => goToReview(report.child, report.start_date)}
                      >
                        <AlertCircle className="mr-2 h-4 w-4" />
                        Есть задания на проверку — перейти в «Проверка»
                      </Button>

                      <Button
                        className="w-full cursor-pointer bg-brand-primary font-semibold text-brand-dark hover:bg-brand-primary-hover"
                        onClick={() => handleCloseWeek(report)}
                        disabled={!canClose || closeWeekMutation.isPending}
                        title={
                          canClose
                            ? "Закрыть неделю и отметить выплату"
                            : "Неделю можно закрыть только после воскресенья"
                        }
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        {canClose
                          ? "Закрыть неделю и отметить выплату"
                          : "Закрытие недоступно до окончания недели"}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
