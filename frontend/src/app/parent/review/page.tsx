// frontend/src/app/parent/review/page.tsx
"use client"

import { useEffect, useState } from "react"
import { parentApi } from "@/services/parentApi"
import { useChildren } from "@/hooks/useChildren"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { CheckCircle2, Clock, User, Calendar, Repeat } from "lucide-react"

const DAYS_MAP: Record<number, string> = {
  1: "Пн",
  2: "Вт",
  3: "Ср",
  4: "Чт",
  5: "Пт",
  6: "Сб",
  7: "Вс",
}

export default function ParentReviewPage() {
  const [selectedChildId, setSelectedChildId] = useState<string>("ALL")
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const { children, isLoading: childrenLoading } = useChildren()

  const fetchLogs = async () => {
    try {
      const parsedChildId = selectedChildId === "ALL" ? undefined : Number(selectedChildId)
      const data = await parentApi.getTaskLogs(parsedChildId)
      setLogs(data)
    } catch (error) {
      console.error("Ошибка загрузки логов:", error)
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [selectedChildId])

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
    <div className="flex flex-col gap-6 pb-16">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-brand-dark">Проверка заданий</h1>
        {logs.length > 0 && (
          <Button
            size="sm"
            className="bg-brand-primary text-brand-dark hover:bg-brand-primary-hover font-semibold cursor-pointer"
            disabled={selectedIds.length === 0}
            onClick={handleBulkApprove}
          >
            Подтвердить ({selectedIds.length})
          </Button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedChildId("ALL")}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
            selectedChildId === "ALL"
              ? "bg-brand-dark text-white shadow-xs"
              : "bg-white text-brand-muted border border-slate-200 hover:bg-slate-50",
          )}
        >
          Все дети
        </button>
        {children.map((child: any) => (
          <button
            key={child.id}
            onClick={() => setSelectedChildId(String(child.id))}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
              selectedChildId === String(child.id)
                ? "bg-brand-dark text-white shadow-xs"
                : "bg-white text-brand-muted border border-slate-200 hover:bg-slate-50",
            )}
          >
            {child.first_name || child.name || "Ребенок"}
          </button>
        ))}
      </div>

      {logs.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedIds.length === logs.length && logs.length > 0}
              onCheckedChange={toggleSelectAll}
            />
            <span className="text-xs font-medium text-brand-muted">
              Выбрать все ({logs.length})
            </span>
          </div>
        </div>
      )}

      {loading || childrenLoading ? (
        <div className="py-12 text-center text-sm text-brand-muted">
          Загрузка заданий на проверку...
        </div>
      ) : logs.length === 0 ? (
        <div className="py-12 text-center text-sm text-brand-muted">Нет заданий на проверку</div>
      ) : (
        <div className="flex flex-col gap-3">
          {logs.map((log: any) => {
            const isDoneByChild = log.status === "DONE"
            const isApproved = log.status === "APPROVED"
            const currentChild = children.find(
              (c) => String(c.id) === String(log.child_id || log.task?.child),
            )

            return (
              <Card
                key={log.id}
                className={cn(
                  "border-slate-200 bg-white shadow-xs transition-all",
                  isDoneByChild && "border-amber-300 bg-amber-50/20",
                  isApproved && "border-emerald-200 bg-emerald-50/10",
                )}
              >
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedIds.includes(log.id)}
                        onCheckedChange={() => toggleSelect(log.id)}
                        className="mt-1"
                      />
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold text-brand-dark">
                          {log.task_title || log.task?.title || "Задание"}
                        </span>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-brand-muted">
                          {currentChild && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <strong className="text-slate-800">
                                {currentChild.first_name || currentChild.name}
                              </strong>
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {log.date}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-sm font-bold text-emerald-600">
                        +{log.earned_amount || log.earned || 0} ₽
                      </span>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px]",
                          isDoneByChild && "bg-amber-100 text-amber-800",
                          isApproved && "bg-emerald-100 text-emerald-800",
                          !isDoneByChild && !isApproved && "bg-slate-100 text-slate-700",
                        )}
                      >
                        {isDoneByChild && "Отмечено ребенком"}
                        {isApproved && "Подтверждено"}
                        {!isDoneByChild && !isApproved && log.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
