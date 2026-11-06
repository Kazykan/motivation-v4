"use client"

import { useState } from "react"
import { authApi } from "@/services/authApi"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronLeft } from "lucide-react"
import { ChildStepProps } from "@/types/props"

export function ChildStep({ onBack, onJoined }: ChildStepProps) {
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function join() {
    setLoading(true)
    setError(null)
    try {
      await authApi.joinFamily(code.trim().toUpperCase(), "CHILD")
      onJoined()
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.response?.data?.detail ?? "Неверный код")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-[80vh] flex-col items-center justify-center gap-6 px-6">
      <button
        type="button"
        onClick={onBack}
        className="absolute left-6 top-6 flex items-center gap-1 text-xs font-medium text-brand-muted hover:text-brand-dark"
      >
        <ChevronLeft className="h-4 w-4" />Я не ребёнок
      </button>

      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-xl font-bold text-brand-dark">Код от родителя</h1>
        <p className="max-w-xs text-sm text-brand-muted">
          Попросите родителя открыть раздел «Дети» → «Добавить ребёнка» и продиктовать 4-символьный
          код
        </p>
      </div>

      <Input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        maxLength={4}
        placeholder="ABCD"
        className="h-16 max-w-xs text-center text-2xl uppercase tracking-[0.5em]"
        autoFocus
      />

      <Button
        onClick={join}
        disabled={code.length !== 4 || loading}
        className="h-12 w-full max-w-xs bg-brand-primary text-brand-dark hover:bg-brand-primary-hover"
      >
        {loading ? "Проверяем..." : "Присоединиться"}
      </Button>

      {error && <p className="text-xs text-brand-error">{error}</p>}
    </div>
  )
}
