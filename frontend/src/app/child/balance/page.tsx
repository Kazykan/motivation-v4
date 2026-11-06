"use client"

import { useEffect, useState } from "react"
import { childApi } from "@/services/childApi"
import { Card, CardContent } from "@/components/ui/card"
import { Wallet } from "lucide-react"
import { TaskLogCard } from "@/components/TaskLogCard"
import { MyWeeklyReport } from "@/types/props"
import { WeeklyForecastCard } from "@/components/WeeklyForecastCard"
import { getMonday, addWeeks, toISODate, getWeekEnd } from "@/lib/week"
import { WeekNavigator } from "@/components/WeekNavigator"

export default function ChildBalancePage() {
  const [reports, setReports] = useState<any[]>([])
  const [taskLogs, setTaskLogs] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [weekOffset, setWeekOffset] = useState<number>(0)
  const [data, setData] = useState<MyWeeklyReport | null>(null)

  const weekStart = addWeeks(getMonday(new Date()), weekOffset)
  const weekStartIso = toISODate(weekStart)
  const weekEndIso = toISODate(getWeekEnd(weekStart))

  useEffect(() => {
    childApi
      .getMyWeeklyReport()
      .then(setData)
      .catch((e) => console.error("Ошибка отчёта:", e))
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [reportsData, logsData] = await Promise.all([
          childApi.getMyReports(),
          childApi.getMyTaskLogs(),
        ])
        setReports(reportsData)
        setTaskLogs(logsData)
      } catch (error) {
        console.error("Ошибка загрузки данных баланса:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const currentReport = reports[0] || { total_earned: 0, bonus: 0, penalty: 0 }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h1 className="text-xl font-bold tracking-tight text-brand-dark">Баланс и заработок</h1>

        <WeekNavigator
          weekStart={weekStartIso}
          weekEnd={weekEndIso}
          onPrev={() => setWeekOffset((v) => v - 1)}
          onNext={() => {
            if (weekOffset < 0) setWeekOffset((v) => v + 1)
          }}
          disableNext={weekOffset >= 0}
        />

        <Card className="border-brand-muted/20 bg-brand-dark text-white shadow-lg">
          <CardContent className="flex flex-col gap-4 p-5">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-brand-muted">Текущий баланс</span>
                <span className="text-3xl font-bold">{currentReport.total_earned || 1250} ₽</span>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-primary/20 text-brand-primary">
                <Wallet className="h-6 w-6" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-brand-muted/20 pt-3 text-xs">
              <div>
                <span className="text-brand-muted">Бонусы:</span>{" "}
                <span className="font-semibold text-brand-success">
                  +{currentReport.bonus || 200} ₽
                </span>
              </div>
              <div>
                <span className="text-brand-muted">Штрафы:</span>{" "}
                <span className="font-semibold text-brand-error">
                  -{currentReport.penalty || 0} ₽
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-brand-dark">История выполнения</h2>
        {loading ? (
          <div className="py-8 text-center text-sm text-brand-muted">Загрузка истории...</div>
        ) : taskLogs.length === 0 ? (
          <div className="py-8 text-center text-sm text-brand-muted">История пуста</div>
        ) : (
          <div className="flex flex-col gap-3">
            {taskLogs.map((log: any) => (
              <TaskLogCard key={log.id} log={log} />
            ))}
            {data?.current && <WeeklyForecastCard forecast={data.current} title="Текущая неделя" />}
            {data?.previous && (
              <WeeklyForecastCard forecast={data.previous} title="Предыдущая неделя (не закрыта)" />
            )}
          </div>
        )}
      </section>
    </div>
  )
}
