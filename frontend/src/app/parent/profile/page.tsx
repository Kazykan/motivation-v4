"use client"

import { useMe } from "@/hooks/useMe"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LogOut, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function ParentProfilePage() {
  const { me, ready } = useMe()

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    window.location.href = "/"
  }

  if (!ready) {
    return <div className="py-8 text-center text-sm text-brand-muted">Загрузка профиля...</div>
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold tracking-tight text-brand-dark">Профиль</h1>

      <Card className="border-brand-muted/20 shadow-sm">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-primary-soft text-brand-warning-strong">
            <User className="h-8 w-8" />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-brand-dark">
                {[me?.first_name, me?.last_name].filter(Boolean).join(" ") || "Родитель"}
              </h2>
              <Badge
                variant="secondary"
                className="bg-brand-primary-soft text-brand-warning-strong"
              >
                Родитель
              </Badge>
            </div>
            <span className="text-xs text-brand-muted">
              {me?.telegram_id ? `Telegram ID: ${me.telegram_id}` : "Вход через OAuth"}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-brand-muted/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-brand-dark">Сессия</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Button variant="destructive" size="sm" className="h-9 w-full" onClick={handleLogout}>
            <LogOut className="mr-1.5 h-3.5 w-3.5" />
            Выйти
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
