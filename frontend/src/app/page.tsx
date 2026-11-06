"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { authApi, MeResponse } from "@/services/authApi"
import { OnboardingFlow } from "@/components/auth/OnboardingFlow"
import { AuthButtons } from "@/components/auth/NoTelegramScreen"

type Phase = "init" | "no-auth" | "loading" | "ready" | "error"

function hasTelegramInitData(): boolean {
  if (typeof window === "undefined") return false
  const tg = (window as any).Telegram?.WebApp
  return Boolean(tg?.initData && tg.initData.length > 0)
}

export default function Home() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>("init")
  const [me, setMe] = useState<MeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadMe = async () => {
    setPhase("loading")
    try {
      const data = await authApi.me()
      setMe(data)
      setPhase("ready")
      if (data.onboarded) {
        router.replace(data.role === "PARENT" ? "/parent/tasks" : "/child/tasks")
      }
    } catch (e: any) {
      const status = e?.response?.status
      if (status === 401 || status === 403) {
        setPhase("no-auth")
      } else {
        setError(e?.response?.data?.error ?? e?.response?.data?.detail ?? "Ошибка авторизации")
        setPhase("error")
      }
    }
  }

  useEffect(() => {
    if (hasTelegramInitData()) {
      loadMe()
    } else {
      loadMe()
    }
  }, [])

  if (phase === "init" || phase === "loading") {
    return (
      <div className="flex min-h-[80vh] items-center justify-center text-sm text-brand-muted">
        Загрузка...
      </div>
    )
  }

  if (phase === "no-auth") {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-bold text-brand-dark">Вход в приложение</h1>
          <p className="max-w-xs text-sm text-brand-muted">
            Выберите способ входа. Если вы открыли приложение в браузере — войдите через Google или
            VK. Если через Telegram-бота — приложение войдёт автоматически.
          </p>
        </div>
        <AuthButtons />
      </div>
    )
  }

  if (phase === "error") {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-brand-error">{error}</p>
      </div>
    )
  }

  if (me && !me.onboarded) {
    return <OnboardingFlow onDone={loadMe} />
  }

  return null
}
