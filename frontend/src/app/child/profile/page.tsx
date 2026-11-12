"use client"

import { useQuery } from "@tanstack/react-query"
import { useMe } from "@/hooks/useMe"
import { childApi } from "@/services/childApi"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LogOut, User, Trophy, CalendarDays } from "lucide-react"

function calcAge(birthDate?: string | null): number | null {
  if (!birthDate) return null
  const b = new Date(birthDate)
  if (isNaN(b.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--
  return age
}

export default function ChildProfilePage() {
  const { me, ready } = useMe()

  const { data: reports = [] } = useQuery<any[]>({
    queryKey: ["child-payouts"],
    queryFn: () => childApi.getMyReports(),
  })

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    window.location.href = "/"
  }

  if (!ready) {
    return <div className="py-8 text-center text-sm text-brand-muted">Загрузка профиля...</div>
  }

  const fullName = [me?.first_name, me?.last_name].filter(Boolean).join(" ") || "Ребёнок"
  const age = calcAge(me?.birth_date)
  const genderLabel = me?.gender === "MALE" ? "Сын" : me?.gender === "FEMALE" ? "Дочь" : null

  const closedReports = (reports as any[]).filter(
    (r) => r.status === "CLOSED" || r.is_payout_confirmed,
  )
  const totalWeeks = closedReports.length
  const bestWeek = closedReports.reduce((max, r) => Math.max(max, Number(r.total_paid || 0)), 0)

  return (
    <div className="flex flex-col gap-6 pb-20">
      <h1 className="text-xl font-bold tracking-tight text-brand-dark">Профиль</h1>

      <Card className="border-brand-muted/20 shadow-sm">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-primary-soft text-brand-warning-strong">
            <User className="h-8 w-8" />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-semibold text-brand-dark">{fullName}</h2>
              {genderLabel && (
                <Badge className="bg-brand-primary-soft text-brand-warning-strong">
                  {genderLabel}
                </Badge>
              )}
            </div>
            <span className="text-xs text-brand-muted">
              {age !== null ? `${age} лет` : "Возраст не указан"}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-brand-muted/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-brand-dark">
            <Trophy className="h-4 w-4 text-brand-warning" />
            Мои успехи
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 pt-0">
          <div className="flex flex-col rounded-xl bg-brand-surface-alt p-3">
            <span className="text-[11px] text-brand-muted">Закрытых недель</span>
            <span className="text-lg font-bold text-brand-dark">{totalWeeks}</span>
          </div>
          <div className="flex flex-col rounded-xl bg-brand-surface-alt p-3">
            <span className="text-[11px] text-brand-muted">Лучшая неделя</span>
            <span className="text-lg font-bold text-brand-dark">
              {bestWeek > 0 ? `${bestWeek} ₽` : "—"}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-brand-muted/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-brand-dark">
            <CalendarDays className="h-4 w-4 text-brand-muted" />
            Семья
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-brand-muted">
            {me?.family_id ? "Вы состоите в семейной группе" : "Семья не привязана"}
          </p>
        </CardContent>
      </Card>

      <Button variant="destructive" size="sm" className="h-9 w-full" onClick={handleLogout}>
        <LogOut className="mr-1.5 h-3.5 w-3.5" />
        Выйти
      </Button>
    </div>
  )
}
