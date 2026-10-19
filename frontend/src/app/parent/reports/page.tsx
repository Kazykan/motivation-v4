"use client"

import { useEffect, useState } from "react"
import { parentApi } from "@/services/parentApi"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, FileText } from "lucide-react"

export default function ParentReportsPage() {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  const fetchReports = async () => {
    try {
      const data = await parentApi.getWeeklyReports()
      setReports(data)
    } catch (error) {
      console.error("Ошибка загрузки отчетов:", error)
      setReports([
        {
          id: 1,
          child_name: "Али",
          age: 12,
          earned: 1250,
          bonus: 200,
          penalty: 0,
          total: 1450,
          tasks_summary: [
            { title: "Уборка комнаты", count: "3/5", sum: "900 ₽" },
            { title: "Помощь на кухне", count: "2/3", sum: "400 ₽" },
            { title: "Доп. задание", count: "1/1", sum: "200 ₽" },
          ],
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [])

  const currentReport = reports[0] || {
    child_name: "Али",
    earned: 1250,
    bonus: 200,
    penalty: 0,
    total: 1450,
    tasks_summary: [],
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Недельный отчет</h1>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-white border border-slate-200 p-3 shadow-xs">
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-xs font-semibold text-slate-800">13 – 19 окт. 2025</span>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-slate-500">Загрузка отчета...</div>
      ) : (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800 font-bold">
                  {currentReport.child_name?.[0]}
                </div>
                <div className="flex flex-col">
                  <CardTitle className="text-sm font-semibold text-slate-900">
                    {currentReport.child_name}
                  </CardTitle>
                  <span className="text-xs text-slate-500">Сын • 12 лет</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-3 text-xs">
              <div className="flex flex-col">
                <span className="text-slate-400">Заработано</span>
                <span className="font-bold text-slate-900">{currentReport.earned} ₽</span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-400">Бонусы</span>
                <span className="font-bold text-emerald-600">+{currentReport.bonus} ₽</span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-400">Штрафы</span>
                <span className="font-bold text-rose-600">-{currentReport.penalty} ₽</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pt-4">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-slate-700">Задания</span>
              <div className="flex flex-col gap-1.5">
                {(currentReport.tasks_summary || []).map((t: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs py-1 border-b border-slate-50 last:border-0"
                  >
                    <span className="text-slate-600">{t.title}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-slate-400">{t.count}</span>
                      <span className="font-medium text-slate-900">{t.sum}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-slate-100 pt-3">
              <span className="text-xs font-semibold text-slate-700">Корректировка</span>
              <div className="rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
                + 200 ₽ (За старание)
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 pt-3">
              <span className="text-sm font-bold text-slate-900">Итоговая сумма</span>
              <span className="text-lg font-extrabold text-slate-900">
                {currentReport.total || 1450} ₽
              </span>
            </div>

            <Button className="w-full bg-amber-400 text-slate-900 hover:bg-amber-500 mt-2">
              Сохранить отчет
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
