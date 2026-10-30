"use client"

import { useEffect, useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Inter } from "next/font/google"
import "./globals.css"
import { Navigation } from "@/components/Navigation"
import Script from "next/script"

const inter = Inter({ subsets: ["cyrillic", "latin"] })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  const [tgReady, setTgReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    let attempts = 0

    const tryInit = () => {
      if (cancelled) return
      const tg = (window as any).Telegram?.WebApp
      if (tg) {
        tg.ready()
        tg.expand()
        // Диагностика в консоль Telegram-клиента (Safari/Chrome)
        console.log("[TG] initData length:", tg.initData?.length ?? 0)
        console.log("[TG] initDataUnsafe:", tg.initDataUnsafe)
        setTgReady(true)
      } else if (attempts++ < 50) {
        // до 5 сек ждём появления Telegram SDK
        setTimeout(tryInit, 100)
      } else {
        console.warn("[TG] SDK не загрузился — открыто вне Telegram?")
        setTgReady(true) // рендерим всё равно
      }
    }
    tryInit()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <html lang="ru" className="h-full antialiased" suppressHydrationWarning>
      <head>
        {/* beforeInteractive = инжектится в initial HTML, доступен до гидратации */}
        <Script src="https://telegram.org/js/telegram-web-app.js?64" strategy="beforeInteractive" />
      </head>
      <body
        className={`${inter.className} flex min-h-full flex-col bg-amber-50/20 text-slate-900 pb-20`}
      >
        <QueryClientProvider client={queryClient}>
          {tgReady ? (
            <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">{children}</main>
          ) : (
            <div className="flex h-screen items-center justify-center text-sm text-slate-500">
              Загрузка Telegram Mini App...
            </div>
          )}
          <Navigation />
        </QueryClientProvider>
      </body>
    </html>
  )
}
