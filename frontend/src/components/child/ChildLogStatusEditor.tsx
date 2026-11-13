"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { Check, Clock3, RotateCcw, X } from "lucide-react"
import { LogHistoryViewer } from "@/components/LogHistoryViewer"
import { ChildLogStatusEditorProps } from "@/types/props"
import { formatLongDay } from "@/lib/dates"

export function ChildLogStatusEditor({
  logId,
  date,
  status,
  weekClosed = false,
  onMarkDone,
  onCancel,
  onClose,
}: ChildLogStatusEditorProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const disabled = saving || weekClosed

  const isNeutral = status === "NONE"
  const isDone = status === "DONE"
  const isApproved = status === "APPROVED"
  const isRejected = status === "REJECTED"
  const isCancelled = status === "CANCELLED"

  const run = async (fn: () => Promise<void>) => {
    setSaving(true)
    setError(null)
    try {
      await fn()
      onClose()
    } catch (err) {
      console.error("Ошибка изменения статуса:", err)
      setError("Не удалось сохранить. Попробуйте ещё раз.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="animate-in slide-in-from-bottom-2 space-y-3 rounded-xl border border-app-surface bg-app-card p-3 shadow-sm duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-text-main">Статус выполнения</p>
          <p className="text-xs text-text-muted">{formatLongDay(date)}</p>
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
        <div className="rounded-lg border border-finance-positive/30 bg-finance-positive/10 p-2 text-[11px] text-finance-positive">
          Неделя закрыта и выплачена. Изменять отметки нельзя.
        </div>
      )}

      {/* Подсказка по текущему состоянию */}
      {isNeutral && !weekClosed && (
        <div className="rounded-lg border border-app-surface bg-app-surface p-2 text-[11px] text-text-muted">
          День не отмечен. Отметьте выполнение — родитель увидит его на проверке.
        </div>
      )}
      {isCancelled && !weekClosed && (
        <div className="rounded-lg border border-app-surface bg-app-surface p-2 text-[11px] text-text-muted">
          Отметка отменена. День считается неотмеченным, но история сохранена.
        </div>
      )}
      {isApproved && (
        <div className="rounded-lg border border-finance-positive/30 bg-finance-positive/10 p-2 text-[11px] text-finance-positive">
          Родитель подтвердил выполнение. Изменить нельзя.
        </div>
      )}
      {isRejected && !weekClosed && (
        <div className="rounded-lg border border-finance-negative/30 bg-finance-negative/10 p-2 text-[11px] text-finance-negative">
          Родитель отклонил отметку. Можно отметить снова.
        </div>
      )}

      {/* Действия */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={disabled || isDone || isApproved}
          onClick={() => run(() => onMarkDone(logId, date))}
          aria-pressed={isDone}
          className={cn(
            "flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-xl border-2 p-2 transition-all",
            "disabled:cursor-not-allowed disabled:opacity-60",
            isDone
              ? "border-finance-pending/40 bg-finance-pending/10 text-finance-pending"
              : "border-app-surface bg-app-bg text-text-muted hover:bg-app-surface",
          )}
        >
          <Clock3 className={cn("h-5 w-5", isDone ? "text-finance-pending" : "text-text-muted")} />
          <span className="text-center text-xs font-semibold leading-tight">
            {isDone ? "Ожидает родителя" : "Выполнено"}
          </span>
        </button>

        <button
          type="button"
          disabled={disabled || isNeutral || isApproved || isCancelled}
          onClick={() => logId && run(() => onCancel(logId))}
          aria-pressed={isCancelled}
          className={cn(
            "flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-xl border-2 p-2 transition-all",
            "disabled:cursor-not-allowed disabled:opacity-60",
            isCancelled
              ? "border-app-surface bg-app-surface text-text-muted"
              : "border-app-surface bg-app-bg text-text-muted hover:bg-app-surface",
          )}
        >
          <RotateCcw className="h-5 w-5" />
          <span className="text-center text-xs font-semibold leading-tight">
            {isCancelled ? "Отменено" : "Вернуть как было"}
          </span>
        </button>
      </div>

      {isApproved && (
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-finance-positive">
          <Check className="h-3.5 w-3.5" />
          Подтверждено родителем
        </div>
      )}

      {saving && <p className="text-center text-xs text-text-muted">Сохранение...</p>}

      {error && (
        <p role="alert" className="text-xs text-finance-negative">
          {error}
        </p>
      )}

      <Separator />

      {logId && logId > 0 ? (
        <LogHistoryViewer logId={logId} />
      ) : (
        <div className="text-xs text-text-muted">Изменений пока нет</div>
      )}
    </div>
  )
}
