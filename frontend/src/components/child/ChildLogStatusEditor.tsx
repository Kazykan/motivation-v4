"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { Check, Clock3, RotateCcw, X, AlertTriangle } from "lucide-react"
import { LogHistoryViewer } from "@/components/LogHistoryViewer"
import { ChildLogStatusEditorProps } from "@/types/props"
import { formatLongDay, formatDateISO } from "@/lib/dates"

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

  const isFuture = date > formatDateISO(new Date())
  const isLockedByWeek = weekClosed
  const isLockedByDate = isFuture

  const disabled = saving || isLockedByWeek || isLockedByDate

  const isNeutral = status === "NONE"
  const isDone = status === "DONE"
  const isApproved = status === "APPROVED"
  const isRejected = status === "REJECTED"
  const isCancelled = status === "CANCELLED"

  const run = async (fn: () => Promise<void>) => {
    if (disabled) return
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

      {/* ── Блок предупреждений ── */}

      {isLockedByDate && (
        <div className="flex items-start gap-2 rounded-lg border border-finance-negative/40 bg-finance-negative/10 p-2.5 text-[11px] text-finance-negative">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="font-medium leading-snug">
            Нельзя отмечать будущее. Этот день ещё не наступил.
          </span>
        </div>
      )}

      {isLockedByWeek && (
        <div className="rounded-lg border border-finance-positive/30 bg-finance-positive/10 p-2 text-[11px] text-finance-positive">
          Неделя закрыта и выплачена. Изменять отметки нельзя.
        </div>
      )}

      {!isLockedByDate && !isLockedByWeek && isNeutral && (
        <div className="rounded-lg border border-app-surface bg-app-surface p-2 text-[11px] text-text-muted">
          День не отмечен. Отметьте выполнение — родитель увидит его на проверке.
        </div>
      )}

      {!isLockedByDate && !isLockedByWeek && isCancelled && (
        <div className="rounded-lg border border-app-surface bg-app-surface p-2 text-[11px] text-text-muted">
          Отметка отменена. День считается неотмеченным, но история сохранена.
        </div>
      )}

      {isApproved && (
        <div className="rounded-lg border border-finance-positive/30 bg-finance-positive/10 p-2 text-[11px] text-finance-positive">
          Родитель подтвердил выполнение. Изменить нельзя.
        </div>
      )}

      {!isLockedByDate && !isLockedByWeek && isRejected && (
        <div className="rounded-lg border border-finance-negative/30 bg-finance-negative/10 p-2 text-[11px] text-finance-negative">
          Родитель отклонил отметку. Можно отметить снова.
        </div>
      )}

      {/* ── Действия ── */}

      <div className="grid grid-cols-2 gap-2">
        {/* Выполнено / Ждёт проверки */}
        <button
          type="button"
          disabled={disabled || isDone || isApproved}
          onClick={() => run(() => onMarkDone(logId, date))}
          aria-pressed={isDone}
          aria-disabled={disabled || isDone || isApproved}
          className={cn(
            "flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-xl border-2 p-2 transition-all",
            "disabled:cursor-not-allowed",
            // активный / выбранный статус DONE
            isDone &&
              !disabled &&
              "border-finance-pending/40 bg-finance-pending/10 text-finance-pending",
            isDone && disabled && "border-app-surface bg-app-surface text-text-muted/60",
            // недоступно (future/week closed/approved) — серое
            disabled && !isDone && "border-app-surface bg-app-surface text-text-muted/50",
            // доступно к нажатию
            !disabled &&
              !isDone &&
              !isApproved &&
              "border-finance-pending/40 bg-app-bg text-finance-pending hover:bg-finance-pending/5",
            // уже подтверждено — серая
            isApproved && "border-app-surface bg-app-surface text-text-muted/50",
          )}
        >
          <Clock3
            className={cn(
              "h-5 w-5",
              isDone && !disabled && "text-finance-pending",
              !isDone && !disabled && !isApproved && "text-finance-pending",
              (disabled || isApproved) && "text-text-muted/50",
            )}
          />
          <span className="text-center text-xs font-semibold leading-tight">
            {isDone ? "Ждёт проверки" : isApproved ? "Проверено" : "Выполнено"}
          </span>
          {isDone && !disabled && (
            <span className="text-[9px] font-medium opacity-80">Нажмите, чтобы отменить</span>
          )}
        </button>

        {/* Отменить отметку / Отменено */}
        <button
          type="button"
          disabled={disabled || isNeutral || isApproved || isCancelled}
          onClick={() => logId && run(() => onCancel(logId))}
          aria-pressed={isCancelled}
          aria-disabled={disabled || isNeutral || isApproved || isCancelled}
          className={cn(
            "flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-xl border-2 p-2 transition-all",
            "disabled:cursor-not-allowed",
            // активный статус CANCELLED
            isCancelled && "border-app-surface bg-app-surface text-text-muted",
            // заблокировано (future/week closed/approved/neutral)
            disabled && !isCancelled && "border-app-surface bg-app-surface text-text-muted/50",
            // доступно к нажатию — красный акцент, явно живая
            !disabled &&
              !isNeutral &&
              !isApproved &&
              !isCancelled &&
              "border-finance-negative/40 bg-app-bg text-finance-negative hover:bg-finance-negative/5",
          )}
        >
          {isCancelled ? (
            <RotateCcw className="h-5 w-5 text-text-muted" />
          ) : (
            <X
              className={cn(
                "h-5 w-5",
                !disabled && !isNeutral && !isApproved
                  ? "text-finance-negative"
                  : "text-text-muted/50",
              )}
            />
          )}
          <span className="text-center text-xs font-semibold leading-tight">
            {isCancelled ? "Отменено" : "Отменить отметку"}
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
