"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { Check, Clock3, X, Trash2 } from "lucide-react"
import { LogHistoryViewer } from "@/components/LogHistoryViewer"
import { LogStatusValue } from "@/types/props"
import { formatLongDay } from "@/lib/dates"

interface LogStatusEditorProps {
  logId: number
  date: string
  status: LogStatusValue
  weekClosed?: boolean
  onChangeStatus: (logId: number, status: LogStatusValue) => Promise<void>
  onClose: () => void
}

const STATUS_OPTIONS: {
  value: LogStatusValue
  label: string
  icon: typeof Clock3
  activeClass: string
  iconClass: string
}[] = [
  {
    value: "DONE",
    label: "Ожидает",
    icon: Clock3,
    activeClass: "border-brand-warning bg-brand-warning-soft text-brand-warning-strong",
    iconClass: "text-brand-warning",
  },
  {
    value: "APPROVED",
    label: "Подтверждено",
    icon: Check,
    activeClass: "border-brand-success bg-brand-success-soft text-brand-success-strong",
    iconClass: "text-brand-success",
  },
  {
    value: "REJECTED",
    label: "Отклонено",
    icon: X,
    activeClass: "border-brand-error bg-brand-error-soft text-brand-error-strong",
    iconClass: "text-brand-error",
  },
]

export function LogStatusEditor({
  logId,
  date,
  status,
  weekClosed = false,
  onChangeStatus,
  onClose,
}: LogStatusEditorProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const disabled = saving || weekClosed

  const handleStatusChange = async (nextStatus: LogStatusValue) => {
    if (nextStatus === status || disabled) return

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

  return (
    <div className="animate-in slide-in-from-bottom-2 space-y-3 rounded-xl border border-brand-muted/20 bg-card p-3 shadow-sm duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-dark">Статус выполнения</p>
          <p className="text-xs text-brand-muted">{formatLongDay(date)}</p>
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

      {weekClosed && (
        <div className="rounded-lg border border-brand-success bg-brand-success-soft p-2 text-[11px] text-brand-success-strong">
          Неделя закрыта и выплачена. Изменять отметки нельзя.
        </div>
      )}

      {status === "CANCELLED" && !weekClosed && (
        <div className="rounded-lg border border-brand-muted/20 bg-brand-surface-alt p-2 text-[11px] text-brand-muted">
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
              disabled={disabled}
              onClick={() => handleStatusChange(option.value)}
              aria-pressed={isActive}
              className={cn(
                "flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-xl border-2 p-2 transition-all",
                "disabled:cursor-not-allowed disabled:opacity-60",
                isActive
                  ? option.activeClass
                  : "border-border bg-background text-brand-muted hover:bg-brand-surface-alt",
              )}
            >
              <Icon className={cn("h-5 w-5", isActive ? option.iconClass : "text-brand-muted")} />
              <span className="text-center text-xs font-semibold leading-tight">
                {option.label}
              </span>
              {isActive && <span className="text-[9px] font-medium">Текущий</span>}
            </button>
          )
        })}
      </div>

      {saving && <p className="text-center text-xs text-brand-muted">Сохранение...</p>}

      {error && (
        <p role="alert" className="text-xs text-brand-error">
          {error}
        </p>
      )}

      <Separator />

      {logId > 0 && (
        <Button
          type="button"
          variant="outline"
          className="w-full border-brand-error/30 text-brand-error hover:bg-brand-error-soft hover:text-brand-error-strong"
          disabled={disabled || status === "CANCELLED"}
          onClick={() => handleStatusChange("CANCELLED")}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {status === "CANCELLED" ? "Отметка удалена" : "Удалить отметку"}
        </Button>
      )}

      {logId > 0 ? (
        <LogHistoryViewer logId={logId} />
      ) : (
        <div className="text-xs text-brand-muted">Изменений пока нет</div>
      )}
    </div>
  )
}
