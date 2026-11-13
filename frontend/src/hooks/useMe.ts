"use client"

import { useQuery } from "@tanstack/react-query"
import { authApi, MeResponse } from "@/services/authApi"

export function useMe() {
  const {
    data: me,
    isLoading,
    error,
  } = useQuery<MeResponse>({
    queryKey: ["me"],
    queryFn: () => authApi.me(),
    retry: false, // Не пытаться бесконечно, если 401
  })

  return {
    me: me ?? null,
    ready: !isLoading,
    error,
  }
}
