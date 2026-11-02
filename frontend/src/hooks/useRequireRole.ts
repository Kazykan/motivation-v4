"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { authApi, MeResponse, UserRole } from "@/services/authApi"

/**
 * Проверяет, что пользователь онборджен и имеет нужную роль.
 * При несоответствии — редиректит.
 *
 * Возвращает { me, ready }:
 * - ready=false — ещё идёт проверка, страница не должна показывать контент;
 * - ready=true — проверка пройдена, можно рендерить.
 */
export function useRequireRole(requiredRole: UserRole) {
  const router = useRouter()
  const [me, setMe] = useState<MeResponse | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    authApi
      .me()
      .then((data) => {
        if (cancelled) return

        if (!data.onboarded) {
          router.replace("/")
          return
        }

        if (data.role !== requiredRole) {
          router.replace(data.role === "PARENT" ? "/parent/tasks" : "/child/tasks")
          return
        }

        setMe(data)
        setReady(true)
      })
      .catch(() => {
        if (cancelled) return
        router.replace("/")
      })

    return () => {
      cancelled = true
    }
  }, [router, requiredRole])

  return { me, ready }
}
