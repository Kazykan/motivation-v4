// components/ProfileMenuSheet.tsx
"use client"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useMe } from "@/hooks/useMe"
import Link from "next/link"
import { User, Bell, LogOut } from "lucide-react"

export function ProfileMenuSheet() {
  const { me } = useMe()
  if (!me) return null
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="rounded-full active:scale-95 transition">
          <Avatar className="h-8 w-8">
            <AvatarImage src={me.avatar_url ?? ""} />
            <AvatarFallback>{me.first_name?.[0] ?? "?"}</AvatarFallback>
          </Avatar>
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8">
        <SheetHeader className="text-left">
          <SheetTitle>
            {me.first_name} {me.last_name}
          </SheetTitle>
        </SheetHeader>
        <nav className="mt-4 flex flex-col">
          <Link
            href="/parent/profile"
            className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-muted"
          >
            <User className="h-5 w-5" /> Мой профиль
          </Link>
          <Link
            href="/parent/profile#notifications"
            className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-muted"
          >
            <Bell className="h-5 w-5" /> Уведомления
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 rounded-lg px-3 py-3 text-destructive hover:bg-muted"
          >
            <LogOut className="h-5 w-5" /> Выйти
          </button>
        </nav>
      </SheetContent>
    </Sheet>
  )
}
