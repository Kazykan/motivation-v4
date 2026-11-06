"use client"

import { useState } from "react"
import { authApi } from "@/services/authApi"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronLeft, Plus, KeyRound } from "lucide-react"
import { ParentStepProps } from "@/types/props"

export function ParentStep({ onBack, onCreated, onJoined }: ParentStepProps) {
  const [mode, setMode] = useState<"choose" | "enter-code">("choose")
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function createFamily() {
    setLoading(true)
    setError(null)
    try {
      const res = await authApi.registerParent()
      onCreated(res.invite_code ?? "")
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.response?.data?.detail ?? "Не удалось создать семью")
    } finally {
      setLoading(false)
    }
  }

  async function joinAsParent() {
    setLoading(true)
    setError(null)
    try {
      await authApi.joinFamily(code.trim().toUpperCase(), "PARENT")
      onJoined()
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.response?.data?.detail ?? "Неверный код")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-6 px-6">
      <button
        type="button"
        onClick={onBack}
        className="absolute left-6 top-6 flex items-center gap-1 text-xs font-medium text-brand-muted hover:text-brand-dark"
      >
        <ChevronLeft className="h-4 w-4" />
        Назад
      </button>

      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-xl font-bold text-brand-dark">Ваша семья</h1>
        <p className="text-sm text-brand-muted">
          Создайте новую семью или присоединитесь к уже созданной
        </p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <Button
          onClick={createFamily}
          disabled={loading}
          className="h-16 justify-start gap-3 rounded-2xl bg-brand-primary px-4 text-left text-brand-dark hover:bg-brand-primary-hover"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-primary-hover/30">
            <Plus className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Создать семью</span>
            <span className="text-xs opacity-80">Приглашу ребёнка по коду</span>
          </div>
        </Button>

        {mode === "choose" ? (
          <Button
            variant="outline"
            onClick={() => setMode("enter-code")}
            disabled={loading}
            className="h-16 justify-start gap-3 rounded-2xl px-4 text-left"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-surface-alt">
              <KeyRound className="h-5 w-5 text-brand-muted" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-brand-dark">У меня есть код</span>
              <span className="text-xs text-brand-muted">
                Код от второго родителя, который уже создал семью
              </span>
            </div>
          </Button>
        ) : (
          <div className="flex flex-col gap-2 rounded-2xl border border-brand-muted/20 bg-white p-3">
            <label className="text-xs font-medium text-brand-muted">Код приглашения</label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={4}
              placeholder="ABCD"
              className="h-12 text-center text-2xl uppercase tracking-[0.5em]"
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMode("choose")
                  setCode("")
                  setError(null)
                }}
                disabled={loading}
                className="flex-1"
              >
                Отмена
              </Button>
              <Button
                onClick={joinAsParent}
                disabled={code.length !== 4 || loading}
                className="flex-1 bg-brand-primary text-brand-dark hover:bg-brand-primary-hover"
              >
                {loading ? "Проверяем..." : "Войти"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-brand-error">{error}</p>}
    </div>
  )
}
