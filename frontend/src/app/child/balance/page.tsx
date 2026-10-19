// src/app/child/balance/page.tsx
"use client"

import { useEffect, useState } from "react"
import { childApi } from "@/services/childApi"
import { Card, CardContent } from "@/components/ui/card"
import { Wallet } from "lucide-react"
import { TaskLogCard } from "@/components/TaskLogCard"

export default function ChildBalancePage() {
  const [reports, setReports] = useState<any[]>([])
  const [taskLogs, setTaskLogs] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(true)

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

  useEffect(() => {
    fetchData()
  }, [])

  const currentReport = reports[0] || {
    total_earned: 0,
    bonus: 0,
    penalty: 0,
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Баланс и заработок</h1>
        <Card className="border-slate-200 bg-slate-900 text-white shadow-lg">
          <CardContent className="flex flex-col gap-4 p-5">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">Текущий баланс</span>
                <span className="text-3xl font-bold">{currentReport.total_earned || 1250} ₽</span>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-400">
                <Wallet className="h-6 w-6" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-slate-800 pt-3 text-xs">
              <div>
                <span className="text-slate-400">Бонусы:</span>{" "}
                <span className="font-semibold text-emerald-400">
                  +{currentReport.bonus || 200} ₽
                </span>
              </div>
              <div>
                <span className="text-slate-400">Штрафы:</span>{" "}
                <span className="font-semibold text-rose-400">-{currentReport.penalty || 0} ₽</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-slate-900">История выполнения</h2>
        {loading ? (
          <div className="py-8 text-center text-sm text-slate-500">Загрузка истории...</div>
        ) : taskLogs.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">История пуста</div>
        ) : (
          <div className="flex flex-col gap-3">
            {taskLogs.map((log: any) => (
              <TaskLogCard key={log.id} log={log} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
