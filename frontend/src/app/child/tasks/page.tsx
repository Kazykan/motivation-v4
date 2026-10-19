"use client"

import { useEffect, useState } from "react"
import { childApi } from "@/services/childApi"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Wallet, CheckSquare, Clock, ArrowRight, CheckCircle2 } from "lucide-react"
import { TaskCard } from "@/components/TaskCard"
import Link from "next/link"

export default function ChildTasksPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [submittingId, setSubmittingId] = useState<number | null>(null)

  const fetchTasks = async () => {
    try {
      const data = await childApi.getMyTasks()
      setTasks(data)
    } catch (error) {
      console.error("Ошибка загрузки задач:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [])

  const handleComplete = async (taskId: number) => {
    const today = new Date().toISOString().split("T")[0]
    setSubmittingId(taskId)
    try {
      await childApi.submitTaskExecution(taskId, today)
      await fetchTasks()
    } catch (error) {
      console.error("Ошибка отправки задачи:", error)
    } finally {
      setSubmittingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Мой заработок</h1>
          <Link
            href="/child/balance"
            className="flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-700"
          >
            Отчет <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <Card className="border-slate-200 bg-slate-900 text-white shadow-lg">
          <CardContent className="flex items-center justify-between p-5">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-slate-400">За эту неделю</span>
              <span className="text-2xl font-bold">1 250 ₽</span>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-400">
              <Wallet className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Мои задания</h2>
          <span className="text-xs text-slate-500">Все ({tasks.length})</span>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-slate-500">Загрузка заданий...</div>
        ) : tasks.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">Нет активных заданий</div>
        ) : (
          <div className="flex flex-col gap-3">
            {tasks.map((task: any) => (
              <TaskCard
                key={task.id}
                task={task}
                isSubmitting={submittingId === task.id}
                onComplete={handleComplete}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
