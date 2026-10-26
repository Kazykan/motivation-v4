// frontend/src/app/layout.tsx
"use client"

import { useState } from "react"
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

  return (
    <html lang="ru" className="h-full antialiased">
      <body
        className={`${inter.className} flex min-h-full flex-col bg-amber-50/20 text-slate-900 pb-20`}
      >
        <QueryClientProvider client={queryClient}>
          <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">{children}</main>
          <Navigation />
        </QueryClientProvider>
      </body>
    </html>
  )
}
