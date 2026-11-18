// app/layout.tsx
import type { Metadata } from "next"
import { Inter, Cormorant_Garamond } from "next/font/google"
import Script from "next/script"
import "./globals.css"
import { AppShell } from "@/components/AppShell"
import { Asimovian } from "next/font/google"

const inter = Inter({ subsets: ["cyrillic", "latin"], variable: "--font-sans" })
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-cormorant",
  display: "swap",
})

const asimovian = Asimovian({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-asimovian",
  display: "swap",
})

export const metadata: Metadata = {
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Motivation" },
  icons: { apple: "/icons/apple-touch-icon.png" },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ru"
      className={`${inter.variable} ${cormorant.variable} ${asimovian.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <Script src="https://telegram.org/js/telegram-web-app.js?64" strategy="beforeInteractive" />
      </head>
      <body
        className={`${inter.className} flex min-h-full flex-col bg-app-bg text-text-main`}
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
