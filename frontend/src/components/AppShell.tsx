// components/AppShell.tsx
"use client"

import { useEffect, useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Navigation } from "@/components/Navigation"
import { ProfileMenuSheet } from "./ProfileMenuSheet"

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
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
        {/* Шапка — sticky, sibling main, без двойных паддингов */}
        <header className="sticky top-0 z-20 flex items-center justify-end bg-background/80 px-4 py-2 backdrop-blur">
          <ProfileMenuSheet />
        </header>

        {/* Контент */}
        <main className="flex-1 px-4 pb-6 pt-2">{children}</main>
      </div>
      <Navigation />
    </QueryClientProvider>
  )
}
