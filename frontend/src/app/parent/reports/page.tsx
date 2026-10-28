"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { parentApi } from "@/services/parentApi"
import { useChildren } from "@/hooks/useChildren"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, Wallet } from "lucide-react"
import { useRouter } from "next/navigation"

export default function ParentReportsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { children, isLoading: childrenLoading } = useChildren()

  const [selectedChildId, setSelectedChildId] = useState<number | null>(null)

  // Загружаем отчеты через TanStack Query
  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ["weekly-reports", selectedChildId],
    queryFn: () => parentApi.getWeeklyReports(selectedChildId || undefined),
    enabled: !childrenLoading,
  })

  // Мутация для закрытия недели и отметки выплаты
  const closeReportMutation = useMutation({
    mutationFn: ({ reportId, data }: { reportId: number; data: any }) =>
      parentApi.closeWeeklyReport(reportId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weekly-reports"] })
    },
  })

  const loading = childrenLoading || reportsLoading

  const handleCloseWeek = (reportId: number) => {
    closeReportMutation.mutate({
      reportId,
      data: {
        is_payout_confirmed: true,
        status: "CLOSED",
      },
    })
  }

  const goToReview = (childId: number, weekStart?: string) => {
    const params = new URLSearchParams()
    params.set("child_id", String(childId))
    if (weekStart) params.set("week_start", weekStart)
    router.push(`/parent/review?${params.toString()}`)
  }

  return (
    <div className="flex flex-col gap-6 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Недельные отчеты</h1>
      </div>

      {/* Фильтр по детям */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setSelectedChildId(null)}
          className={`cursor-pointer whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
            selectedChildId === null
              ? "bg-slate-900 text-white shadow-xs"
              : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
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
                ? "bg-slate-900 text-white shadow-xs"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {child.first_name || child.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-500">Загрузка отчетов...</div>
      ) : reports.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-500">Нет доступных отчетов</div>
      ) : (
        <div className="flex flex-col gap-4">
          {reports.map((report: any) => {
            const childInfo = children.find((c: any) => c.id === report.child)
            const isClosed = report.is_payout_confirmed || report.status === "CLOSED"

            return (
              <Card key={report.id} className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800 font-bold">
                        {(childInfo?.first_name || childInfo?.name || "Р")?.[0]}
                      </div>
                      <div className="flex flex-col">
                        <CardTitle className="text-sm font-semibold text-slate-900">
                          {childInfo?.first_name || childInfo?.name || "Ребенок"}
                        </CardTitle>
                        <span className="text-xs text-slate-500">
                          Период: {report.start_date} – {report.end_date}
                        </span>
                      </div>
                    </div>
                    <Badge
                      className={
                        isClosed ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                      }
                    >
                      {isClosed ? "Выплачено" : "Ждет проверки"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 pt-4">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="flex flex-col">
                      <span className="text-slate-400">Заработано</span>
                      <span className="font-bold text-slate-900">{report.calculated_amount} ₽</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-slate-400">Корректировка</span>
                      <span className="font-bold text-emerald-600">
                        +{report.manual_adjustment} ₽
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-slate-400">Итого к выплате</span>
                      <span className="font-extrabold text-slate-900">{report.final_sum} ₽</span>
                    </div>
                  </div>

                  {/* Кнопка быстрого перехода на вкладку проверка, если неделя не закрыта */}
                  {!isClosed && (
                    <div className="flex flex-col gap-2 pt-2">
                      <Button
                        variant="outline"
                        className="w-full text-amber-700 border-amber-300 bg-amber-50/50 hover:bg-amber-100"
                        onClick={() => goToReview(report.child, report.start_date)}
                      >
                        <AlertCircle className="mr-2 h-4 w-4" />
                        Есть задания на проверку — перейти в «Проверка»
                      </Button>

                      <Button
                        className="w-full bg-amber-400 text-slate-900 hover:bg-amber-500 font-semibold"
                        onClick={() => handleCloseWeek(report.id)}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Закрыть неделю и отметить выплату
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
