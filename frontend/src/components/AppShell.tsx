// components/AppShell.tsx
"use client"

import { useEffect, useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Navigation } from "@/components/Navigation"

export function AppShell({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp
    if (tg) {
      try {
        tg.ready()
        tg.expand()
      } catch {}
    }
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">{children}</main>
      <Navigation />
    </QueryClientProvider>
  )
}
