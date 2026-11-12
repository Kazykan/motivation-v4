"use client"

import { useEffect, useState } from "react"
import { authApi, MeResponse } from "@/services/authApi"

export function useMe() {
  const [me, setMe] = useState<MeResponse | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    authApi
      .me()
      .then((data) => {
        if (cancelled) return
        setMe(data)
      })
      .catch(() => {
        if (cancelled) return
        setMe(null)
      })
      .finally(() => {
        if (!cancelled) setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { me, ready }
}
