"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { authApi, MeResponse } from "@/services/authApi"
import { OnboardingFlow } from "@/components/auth/OnboardingFlow"

type Phase = "init" | "checking" | "no-auth" | "loading" | "ready" | "error"

/**
 * Отдельная точка входа для Telegram Mini App (URL указывается в BotFather).
 *
 * Здесь ЕДИНСТВЕННОЕ место, где допустимо дождаться загрузки Telegram SDK
 * и проверить initData. Все браузерные страницы (/) этой проверки не делают.
 */
export default function TelegramEntryPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>("init")
  const [me, setMe] = useState<MeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadMe = async () => {
    setPhase("loading")
    try {
      const data = await authApi.me()
      setMe(data)
      if (data.onboarded) {
        setPhase("ready")
        router.replace(data.role === "PARENT" ? "/parent/tasks" : "/child/tasks")
      } else {
        setPhase("onboarding")
      }
    } catch (e: any) {
      const status = e?.response?.status
      if (status === 401 || status === 403) {
        // initData невалиден или пользователь неизвестен — в обычный вход.
        router.replace("/")
        return
      }
      setError(e?.response?.data?.error ?? e?.response?.data?.detail ?? "Ошибка авторизации")
      setPhase("error")
    }
  }

  useEffect(() => {
    let cancelled = false
    let attempts = 0

    const tryInit = () => {
      if (cancelled) return
      const tg = (window as any).Telegram?.WebApp

      if (tg) {
        try {
          tg.ready()
          tg.expand()
        } catch {
          // ignore
        }
      }

      const initData: string | undefined = tg?.initData
      if (initData && initData.length > 0) {
        void loadMe()
        return
      }

      // Дать SDK до ~1.5 секунды (15 * 100ms) на появление initData.
      if (attempts++ < 15) {
        setTimeout(tryInit, 100)
        return
      }

      // Не Telegram-контекст (или старый клиент) — обычный вход.
      router.replace("/")
    }

    tryInit()
    return () => {
      cancelled = true
    }
  }, [])

  if (phase === "onboarding" && me) {
    return <OnboardingFlow onDone={loadMe} />
  }

  if (phase === "error") {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-finance-negative">{error}</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center text-sm text-text-muted">
      Загрузка Telegram Mini App...
    </div>
  )
}
