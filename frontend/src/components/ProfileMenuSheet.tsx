// components/ProfileMenuSheet.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { User, Bell, LogOut, Loader2 } from "lucide-react"

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useMe } from "@/hooks/useMe"

export function ProfileMenuSheet() {
  const { me } = useMe()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  if (!me) return null

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      // 1. Чистим BFF-сессию
      await fetch("/bff/auth/logout", { method: "POST" })
      // 2. Закрываем sheet и уходим на главную
      setOpen(false)
      router.replace("/")
      router.refresh()
    } catch {
      setLoggingOut(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <button
            type="button"
            aria-label="Открыть меню профиля"
            className="ml-1 rounded-full p-1 -m-1 transition active:scale-95"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={me.avatar_url ?? ""} alt="" />
              <AvatarFallback>{me.first_name?.[0] ?? "?"}</AvatarFallback>
            </Avatar>
          </button>
        }
      />

      <SheetContent side="bottom" className="rounded-t-2xl pb-8">
        <SheetHeader className="text-left">
          <SheetTitle>
            {me.first_name} {me.last_name}
          </SheetTitle>
        </SheetHeader>

        <nav className="mt-4 flex flex-col">
          <Link
            href="/parent/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-muted active:bg-muted/70"
          >
            <User className="h-5 w-5" /> Мой профиль
          </Link>
          <Link
            href="/parent/profile#notifications"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-muted active:bg-muted/70"
          >
            <Bell className="h-5 w-5" /> Уведомления
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-3 rounded-lg px-3 py-3 text-destructive hover:bg-muted active:bg-muted/70 disabled:opacity-60"
          >
            {loggingOut ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <LogOut className="h-5 w-5" />
            )}
            {loggingOut ? "Выходим…" : "Выйти"}
          </button>
        </nav>
      </SheetContent>
    </Sheet>
  )
}
