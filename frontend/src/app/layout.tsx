"use client"

import { useEffect, useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Inter, Cormorant_Garamond } from "next/font/google"
import "./globals.css"
import { Navigation } from "@/components/Navigation"
import Script from "next/script"

const inter = Inter({ subsets: ["cyrillic", "latin"], variable: "--font-sans" })

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-cormorant",
  display: "swap",
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
    <html
      lang="ru"
      className={`${inter.variable} ${cormorant.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <Script src="https://telegram.org/js/telegram-web-app.js?64" strategy="beforeInteractive" />
      </head>
      <body
        className={`${inter.className} flex min-h-full flex-col bg-app-bg text-text-main pb-20`}
      >
        <QueryClientProvider client={queryClient}>
          <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">{children}</main>
          <Navigation />
        </QueryClientProvider>
      </body>
    </html>
  )
}
