"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { authApi, MeResponse } from "@/services/authApi"
import { OnboardingFlow } from "@/components/auth/OnboardingFlow"
import { AuthButtons } from "@/components/auth/NoTelegramScreen"

function hasTelegramInitData(): boolean {
  if (typeof window === "undefined") return false
  const tg = (window as any).Telegram?.WebApp
  return Boolean(tg?.initData && tg.initData.length > 0)
}

const AUTH_ERRORS: Record<string, string> = {
  google_cancelled: "Вход через Google отменён.",
  google_state: "Сессия входа через Google истекла. Попробуйте снова.",
  google_failed: "Не удалось войти через Google. Попробуйте ещё раз.",
  vk_cancelled: "Вход через VK ID отменён.",
  vk_state: "Сессия входа через VK ID истекла. Попробуйте снова.",
  vk_pkce: "Ошибка безопасности VK ID. Попробуйте снова.",
  vk_failed: "Не удалось войти через VK ID. Попробуйте ещё раз.",
}

export default function Home() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>("init")
  const [me, setMe] = useState<MeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)

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
    let cancelled = false

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const code = params.get("auth_error")
      if (code && AUTH_ERRORS[code]) {
        setAuthError(AUTH_ERRORS[code])
        window.history.replaceState({}, "", window.location.pathname)
      }
    }

    if (hasTelegramInitData()) {
      router.replace("/tg")
      return
    }

    ;(async () => {
      setPhase("checking")
      try {
        const res = await fetch("/api/auth/state")
        const data = await res.json()
        if (cancelled) return
        if (!data?.hasBffSession) {
          setPhase("no-auth")
          return
        }
        await loadMe()
      } catch {
        if (cancelled) return
        setPhase("no-auth")
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  if (phase === "init" || phase === "checking" || phase === "loading") {
    return (
      <div className="flex min-h-[80vh] items-center justify-center text-sm text-text-muted">
        Загрузка...
      </div>
    )
  }

  if (phase === "no-auth") {
    return (
      <div className="-mx-4 -mt-6 flex flex-col pb-8">
        <div className="relative w-full">
          <div className="relative w-full overflow-hidden" style={{ aspectRatio: "3 / 4" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/illustrations/steppe-hero.png"
              alt="Степь, юрта и кони на фоне гор"
              className="h-full w-full object-cover"
              draggable={false}
            />
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: "linear-gradient(to bottom, #e9ecef 0%, rgba(233,236,239,0) 28%)",
              }}
            />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4"
              style={{
                background: "linear-gradient(to bottom, rgba(233,236,239,0) 0%, #e9ecef 100%)",
              }}
            />
            <div className="pointer-events-none absolute inset-x-0 top-[8%] flex flex-col items-center">
              <h1
                className="text-text-main"
                style={{
                  fontFamily: "var(--font-cormorant), serif",
                  fontSize: "38px",
                  fontWeight: 500,
                  lineHeight: 1.1,
                  letterSpacing: "0.02em",
                }}
              >
                Motivation
              </h1>
              <span aria-hidden className="mt-3 h-px w-10 bg-text-muted/30" />
            </div>
          </div>

          <p className="mx-auto mt-2 max-w-xs px-6 text-center text-sm leading-relaxed text-text-muted">
            Мотивация, которая считает.
            <br />
            Платит родитель. Честно.
          </p>
        </div>

        <div className="mt-8 flex flex-col items-center gap-4 px-6">
          <AuthButtons />

          <p className="max-w-xs text-center text-xs leading-relaxed text-text-muted">
            Открывай в Telegram — там вход автоматический
          </p>

          {authError && (
            <p role="alert" className="max-w-xs text-center text-xs text-finance-negative">
              {authError}
            </p>
          )}
        </div>

        <p className="mt-10 px-6 text-center text-[11px] text-text-muted/70">
          Политика конфиденциальности
        </p>
      </div>
    )
  }

  if (phase === "error") {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-finance-negative">{error}</p>
      </div>
    )
  }

  if (me && !me.onboarded) {
    return <OnboardingFlow onDone={loadMe} />
  }

  return null
}
