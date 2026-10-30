// frontend/src/components/LogStatusEditor.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { Check, Clock3, X, Trash2 } from "lucide-react"
import { LogHistoryViewer } from "@/components/LogHistoryViewer"

export type LogStatus = "DONE" | "APPROVED" | "REJECTED" | "CANCELLED"

interface LogStatusEditorProps {
  logId: number
  date: string
  status: LogStatus
  onChangeStatus: (logId: number, status: LogStatus) => Promise<void>
  onClose: () => void
}

const STATUS_OPTIONS: {
  value: LogStatus
  label: string
  icon: typeof Clock3
  activeClass: string
  iconClass: string
}[] = [
  {
    value: "DONE",
    label: "Ожидает",
    icon: Clock3,
    activeClass: "border-amber-400 bg-amber-50 text-amber-800",
    iconClass: "text-amber-600",
  },
  {
    value: "APPROVED",
    label: "Подтверждено",
    icon: Check,
    activeClass: "border-emerald-500 bg-emerald-50 text-emerald-800",
    iconClass: "text-emerald-600",
  },
  {
    value: "REJECTED",
    label: "Отклонено",
    icon: X,
    activeClass: "border-red-400 bg-red-50 text-red-800",
    iconClass: "text-red-600",
  },
]

export function LogStatusEditor({
  logId,
  date,
  status,
  onChangeStatus,
  onClose,
}: LogStatusEditorProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleStatusChange = async (nextStatus: LogStatus) => {
    if (nextStatus === status || saving) return

    setSaving(true)
    setError(null)

    try {
      await onChangeStatus(logId, nextStatus)
      onClose()
    } catch (err) {
      console.error("Ошибка изменения статуса:", err)
      setError("Не удалось сохранить статус. Попробуйте ещё раз.")
    } finally {
      setSaving(false)
    }
  }

  const formattedDate = new Date(`${date}T12:00:00`).toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  return (
    <div className="animate-in slide-in-from-bottom-2 space-y-3 rounded-xl border bg-card p-3 shadow-sm duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Статус выполнения</p>
          <p className="text-xs text-muted-foreground">{formattedDate}</p>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onClose}
          disabled={saving}
          aria-label="Закрыть редактор"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {status === "CANCELLED" && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-600">
          Отметка удалена. Выберите новый статус, чтобы восстановить запись. История изменений
          сохранена.
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {STATUS_OPTIONS.map((option) => {
          const Icon = option.icon
          const isActive = status === option.value

          return (
            <button
              key={option.value}
              type="button"
              disabled={saving}
              onClick={() => handleStatusChange(option.value)}
              aria-pressed={isActive}
              className={cn(
                "flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-xl border-2 p-2 transition-all",
                "disabled:cursor-not-allowed disabled:opacity-60",
                isActive
                  ? option.activeClass
                  : "border-border bg-background text-muted-foreground hover:bg-muted/60",
              )}
            >
              <Icon
                className={cn("h-5 w-5", isActive ? option.iconClass : "text-muted-foreground")}
              />
              <span className="text-center text-xs font-semibold leading-tight">
                {option.label}
              </span>
              {isActive && <span className="text-[9px] font-medium">Текущий</span>}
            </button>
          )
        })}
      </div>

      {saving && <p className="text-center text-xs text-muted-foreground">Сохранение...</p>}

      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}

      <Separator />

      {logId > 0 && (
        <Button
          type="button"
          variant="outline"
          className="w-full border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
          disabled={saving || status === "CANCELLED"}
          onClick={() => handleStatusChange("CANCELLED")}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {status === "CANCELLED" ? "Отметка удалена" : "Удалить отметку"}
        </Button>
      )}

      {logId > 0 ? (
        <LogHistoryViewer logId={logId} />
      ) : (
        <div className="text-xs text-muted-foreground">Изменений пока нет</div>
      )}
    </div>
  )
}
