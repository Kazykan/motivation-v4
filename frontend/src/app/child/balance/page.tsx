"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { childApi } from "@/services/childApi"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Wallet, Check, Clock3 } from "lucide-react"
import { TaskLogCard } from "@/components/TaskLogCard"
import { WeekNavigator } from "@/components/WeekNavigator"
import { getMonday, addWeeks, toISODate, getWeekEnd } from "@/lib/week"
import { formatMoney } from "@/lib/money"

interface WeeklyReportDto {
  id: number
  child: number
  start_date: string
  end_date: string
  status: "DRAFT" | "REVIEW" | "CLOSED"
  calculated_amount: string
  manual_adjustment: string
  total_paid: string
  is_payout_confirmed: boolean
  payout_date: string | null
}

export default function ChildBalancePage() {
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()))
  const weekStartIso = toISODate(weekStart)
  const weekEndIso = toISODate(getWeekEnd(weekStart))

  const { data: report, isLoading: reportLoading } = useQuery({
    queryKey: ["child-weekly-report"],
    queryFn: () => childApi.getMyWeeklyReport(),
  })

  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ["child-logs", weekStartIso],
    queryFn: () => childApi.getMyTaskLogs(),
  })

  const { data: reports = [] } = useQuery<WeeklyReportDto[]>({
    queryKey: ["child-payouts"],
    queryFn: () => childApi.getMyReports(),
  })

  const weekLogs = useMemo(() => {
    return (logs as any[]).filter((l) => l.date >= weekStartIso && l.date <= weekEndIso)
  }, [logs, weekStartIso, weekEndIso])

  const summary = report?.current?.summary
  const earned = summary?.earned ?? "0.00"
  const pending = summary?.pendingAmount ?? "0.00"
  const remaining = summary?.remaining ?? "0.00"

  const totalSaved = useMemo(
    () =>
      (reports as WeeklyReportDto[])
        .filter((r) => r.status === "CLOSED" || r.is_payout_confirmed)
        .reduce((sum, r) => sum + Number(r.total_paid || 0), 0),
    [reports],
  )

  return (
    <div className="flex flex-col gap-6 pb-20">
      <section className="flex flex-col gap-3">
        <h1 className="text-xl font-bold tracking-tight text-brand-dark">Кошелёк</h1>

        <WeekNavigator
          weekStart={weekStartIso}
          weekEnd={weekEndIso}
          onPrev={() => setWeekStart((d) => addWeeks(d, -1))}
          onNext={() => {
            const current = getMonday(new Date())
            if (weekStart < current) setWeekStart((d) => addWeeks(d, 1))
          }}
          disableNext={weekStart >= getMonday(new Date())}
        />

        {/* Всего накоплено */}
        <Card className="border-brand-muted/20 bg-brand-dark text-white shadow-lg">
          <CardContent className="flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-brand-muted">Всего накоплено</span>
                <span className="text-3xl font-bold">{formatMoney(totalSaved)}</span>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-primary/20 text-brand-primary">
                <Wallet className="h-6 w-6" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 border-t border-brand-muted/20 pt-3 text-xs text-center">
              <div className="flex flex-col gap-0.5">
                <span className="text-brand-muted">Заработано</span>
                <span className="flex items-center justify-center gap-1 font-semibold text-green-400">
                  <Check className="h-3 w-3" />
                  {formatMoney(earned)}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-brand-muted">Ждёт проверки</span>
                <span className="flex items-center justify-center gap-1 font-semibold text-amber-400">
                  <Clock3 className="h-3 w-3" />
                  {formatMoney(pending)}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-brand-muted">Можно ещё</span>
                <span className="font-semibold text-white">{formatMoney(remaining)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Выплаты */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-brand-dark">Выплаты</h2>
        {reports.length === 0 ? (
          <div className="py-6 text-center text-sm text-brand-muted">Пока нет закрытых недель</div>
        ) : (
          <div className="flex flex-col gap-2">
            {(reports as WeeklyReportDto[]).map((r) => {
              const closed = r.status === "CLOSED" || r.is_payout_confirmed
              return (
                <Card key={r.id} className="border-brand-muted/20">
                  <CardContent className="flex items-center justify-between p-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-brand-dark">
                        {r.start_date} — {r.end_date}
                      </span>
                      <span className="text-[11px] text-brand-muted">
                        {closed ? "Выплачено" : "Ждёт закрытия недели"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-brand-dark">
                        {formatMoney(r.total_paid || r.calculated_amount)}
                      </span>
                      <Badge
                        className={
                          closed
                            ? "bg-brand-success-soft text-brand-success-strong"
                            : "bg-brand-warning-soft text-brand-warning-strong"
                        }
                      >
                        {closed ? "Выплачено" : "В ожидании"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      {/* История выполнения за выбранную неделю */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-brand-dark">Выполнения за неделю</h2>
        {logsLoading || reportLoading ? (
          <div className="py-8 text-center text-sm text-brand-muted">Загрузка...</div>
        ) : weekLogs.length === 0 ? (
          <div className="py-8 text-center text-sm text-brand-muted">За эту неделю пусто</div>
        ) : (
          <div className="flex flex-col gap-3">
            {weekLogs.map((log: any) => (
              <TaskLogCard key={log.id} log={log} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
