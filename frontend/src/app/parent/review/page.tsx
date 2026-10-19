"use client"

import { useEffect, useState } from "react"
import { parentApi } from "@/services/parentApi"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ClipboardCheck, CheckCircle2 } from "lucide-react"

export default function ParentReviewPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const fetchLogs = async () => {
    try {
      const data = await parentApi.getTaskLogs()
      setLogs(data)
    } catch (error) {
      console.error("Ошибка загрузки логов:", error)
      setLogs([
        {
          id: 101,
          child_name: "Али",
          task_title: "Уборка комнаты",
          date: "20.10.2025",
          earned: 300,
          time: "12:10",
        },
        {
          id: 102,
          child_name: "Амина",
          task_title: "Помощь на кухне",
          date: "20.10.2025",
          earned: 200,
          time: "11:45",
        },
        {
          id: 103,
          child_name: "Ислам",
          task_title: "Уборка комнаты",
          date: "19.10.2025",
          earned: 300,
          time: "18:20",
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const toggleSelectAll = () => {
    if (selectedIds.length === logs.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(logs.map((l) => l.id))
    }
  }

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
  }

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return
    try {
      await parentApi.bulkApproveLogs(selectedIds)
      setSelectedIds([])
      fetchLogs()
    } catch (error) {
      console.error("Ошибка подтверждения:", error)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Проверка заданий</h1>
        {logs.length > 0 && (
          <Button
            size="sm"
            className="h-8 bg-amber-400 text-slate-900 hover:bg-amber-500"
            disabled={selectedIds.length === 0}
            onClick={handleBulkApprove}
          >
            Подтвердить ({selectedIds.length})
          </Button>
        )}
      </div>

      {logs.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedIds.length === logs.length && logs.length > 0}
              onCheckedChange={toggleSelectAll}
            />
            <span className="text-xs font-medium text-slate-600">Выбрать все ({logs.length})</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-sm text-slate-500">
          Загрузка заданий на проверку...
        </div>
      ) : logs.length === 0 ? (
        <div className="py-8 text-center text-sm text-slate-500">Нет заданий на проверку</div>
      ) : (
        <div className="flex flex-col gap-3">
          {logs.map((log: any) => (
            <Card key={log.id} className="border-slate-200">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedIds.includes(log.id)}
                    onCheckedChange={() => toggleSelect(log.id)}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-900">
                      {log.child_name || "Ребенок"} •{" "}
                      <span className="font-normal text-slate-600">{log.task_title}</span>
                    </span>
                    <span className="text-xs text-slate-500">
                      {log.date} • {log.time || "12:00"}
                    </span>
                  </div>
                </div>
                <span className="text-sm font-semibold text-emerald-600">
                  +{log.earned || 300} ₽
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
