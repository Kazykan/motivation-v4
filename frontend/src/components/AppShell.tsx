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
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-app-bg">
        {/* Шапка — sticky, sibling main, без двойных паддингов, z-10 */}
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-app-bg/80 px-4 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] backdrop-blur">
          <span
            className="font-brand text-text-main leading-none select-none"
            style={{ fontSize: "clamp(20px, 5.5vw, 28px)" }}
            aria-label="Motivation"
          >
            Motivation
          </span>
          <ProfileMenuSheet />
        </header>

        {/* Контент — px-4 здесь, один раз */}
        <main className="flex-1 overflow-y-auto px-4 pt-2 pb-[calc(76px+env(safe-area-inset-bottom)+16px)]">
          {children}
        </main>
      </div>

      {/* Navigation — в том же max-w-md, fixed bottom, z-20 */}
      <Navigation />
    </QueryClientProvider>
  )
}
