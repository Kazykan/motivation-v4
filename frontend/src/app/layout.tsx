import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Navigation } from "@/components/Navigation"

const inter = Inter({ subsets: ["cyrillic", "latin"] })

export const metadata: Metadata = {
  title: "Вместе к большим целям",
  description: "Семейное приложение для воспитания ответственности и финансовой грамотности",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru" className="h-full antialiased">
      <body
        className={`${inter.className} flex min-h-full flex-col bg-amber-50/20 text-slate-900 pb-20`}
      >
        <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">{children}</main>
        <Navigation />
      </body>
    </html>
  )
}
