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
        setTgReady(true)
      } else if (attempts++ < 50) {
        setTimeout(tryInit, 100)
      } else {
        setTgReady(true)
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
        <Script src="https://telegram.org/js/telegram-web-app.js?64" strategy="beforeInteractive" />
      </head>
      <body
        className={`${inter.className} flex min-h-full flex-col bg-brand-surface text-brand-dark pb-20`}
      >
        <QueryClientProvider client={queryClient}>
          {tgReady ? (
            <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">{children}</main>
          ) : (
            <div className="flex h-screen items-center justify-center text-sm text-brand-muted">
              Загрузка Telegram Mini App...
            </div>
          )}
          <Navigation />
        </QueryClientProvider>
      </body>
    </html>
  )
}
