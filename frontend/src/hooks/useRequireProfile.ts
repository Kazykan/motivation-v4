"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useMe } from "@/hooks/useMe"

/**
 * Проверяет, что у ребёнка заполнены обязательные поля профиля
 * (birth_date и gender). Если нет — редиректит на /child/profile?require=1.
 *
 * Возвращает { me, ready }: ready=false означает, что идёт проверка
 * или выполняется редирект — контент рендерить нельзя.
 */
export function useRequireProfile() {
  const router = useRouter()
  const { me, ready } = useMe()

  const missing = !!me && (!me.birth_date || !me.gender)

  useEffect(() => {
    if (!ready || !me) return
    if (missing) {
      router.replace("/child/profile?require=1")
    }
  }, [ready, me, missing, router])

  return { me, ready: ready && !missing }
}
