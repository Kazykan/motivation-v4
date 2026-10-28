// frontend/src/app/layout.tsx
"use client"

import { useEffect, useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Inter } from "next/font/google"
import "./globals.css"
import { Navigation } from "@/components/Navigation"

const inter = Inter({ subsets: ["cyrillic", "latin"] })

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [queryClient] = useState(() => new QueryClient())
  const [isTelegramReady, setIsTelegramReady] = useState(false)

  useEffect(() => {
    // Инициализация Telegram WebApp при старте приложения
    if (typeof window !== "undefined") {
      const tg = (window as any).Telegram?.WebApp
      if (tg) {
        tg.ready()
        tg.expand() // Разворачиваем на весь экран
      }
      setIsTelegramReady(true)
    }
  }, [])

  return (
    <html lang="ru" className="h-full antialiased">
      <body
        className={`${inter.className} flex min-h-full flex-col bg-amber-50/20 text-slate-900 pb-20`}
      >
        <QueryClientProvider client={queryClient}>
          {isTelegramReady ? (
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
