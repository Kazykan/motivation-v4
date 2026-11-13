"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import {
  Calendar as CalendarIcon,
  LogOut,
  User,
  Trophy,
  CalendarDays,
  Pencil,
  Check,
  X,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useMe } from "@/hooks/useMe"
import { childApi } from "@/services/childApi"
import { authApi } from "@/services/authApi"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { parentApi } from "@/services/parentApi"

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
  const queryClient = useQueryClient()

  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
    birth_date: undefined as Date | undefined,
    gender: "" as "MALE" | "FEMALE" | "",
  })

  const { data: reports = [] } = useQuery<any[]>({
    queryKey: ["child-payouts"],
    queryFn: () => childApi.getMyReports(),
  })

  const { data: familyMembers = [] } = useQuery<any[]>({
    queryKey: ["family-members"],
    queryFn: () => parentApi.getFamilyMembers(),
    enabled: !!me?.family_id,
  })

  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => authApi.updateMe(data),
    onSuccess: (updatedData) => {
      queryClient.setQueryData(["me"], updatedData)
      // Инвалидируем запрос, чтобы useMe() подтянул свежие данные при следующем рендере
      queryClient.invalidateQueries({ queryKey: ["me"] })
      setIsEditing(false)
    },
  })

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    window.location.href = "/"
  }

  const startEditing = () => {
    setEditForm({
      first_name: me?.first_name || "",
      last_name: me?.last_name || "",
      birth_date: me?.birth_date ? new Date(me.birth_date) : undefined,
      gender: (me?.gender as "MALE" | "FEMALE") || "",
    })
    setIsEditing(true)
  }

  const saveProfile = () => {
    updateProfileMutation.mutate({
      first_name: editForm.first_name,
      last_name: editForm.last_name,
      birth_date: editForm.birth_date ? format(editForm.birth_date, "yyyy-MM-dd") : null,
      gender: editForm.gender || null,
    })
  }

  if (!ready) {
    return <div className="py-8 text-center text-sm text-text-muted">Загрузка профиля...</div>
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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-text-main">Профиль</h1>
        {!isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={startEditing}
            className="h-8 gap-1.5 text-text-muted hover:text-text-main"
          >
            <Pencil className="h-3.5 w-3.5" />
            Изменить
          </Button>
        )}
      </div>

      {/* Карточка с основной информацией */}
      <Card className="border-app-surface bg-app-card shadow-sm">
        <CardContent className="flex items-start gap-4 p-5">
          <Avatar className="h-16 w-16 shrink-0 rounded-2xl">
            <AvatarImage src={me?.avatar_url ?? undefined} />
            <AvatarFallback className="rounded-2xl bg-brand-primary-soft text-brand-warning-strong text-lg">
              {(fullName || "?").slice(0, 1)}
            </AvatarFallback>
          </Avatar>

          {isEditing ? (
            <div className="flex flex-1 flex-col gap-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Имя"
                  value={editForm.first_name}
                  onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                  className="h-9 bg-app-surface"
                />
                <Input
                  placeholder="Фамилия"
                  value={editForm.last_name}
                  onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                  className="h-9 bg-app-surface"
                />
              </div>

              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger
                    render={
                      <Button
                        variant="outline"
                        className={cn(
                          "h-9 flex-1 justify-start bg-app-surface text-left font-normal",
                          !editForm.birth_date && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editForm.birth_date
                          ? format(editForm.birth_date, "dd.MM.yyyy")
                          : "Дата рождения"}
                      </Button>
                    }
                  />
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={editForm.birth_date}
                      onSelect={(date) => setEditForm({ ...editForm, birth_date: date })}
                      autoFocus
                      captionLayout="dropdown"
                      fromYear={2000}
                      toYear={new Date().getFullYear()}
                    />
                  </PopoverContent>
                </Popover>

                <Select
                  value={editForm.gender}
                  onValueChange={(val) => setEditForm({ ...editForm, gender: val as any })}
                >
                  <SelectTrigger className="h-9 flex-1 bg-app-surface">
                    <SelectValue placeholder="Пол" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Мужской</SelectItem>
                    <SelectItem value="FEMALE">Женский</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 mt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  className="h-8 text-text-muted"
                >
                  <X className="mr-1 h-3.5 w-3.5" /> Отмена
                </Button>
                <Button
                  size="sm"
                  onClick={saveProfile}
                  disabled={updateProfileMutation.isPending}
                  className="h-8 bg-brand-action text-brand-action-text hover:bg-brand-action-hover"
                >
                  <Check className="mr-1 h-3.5 w-3.5" />{" "}
                  {updateProfileMutation.isPending ? "Сохранение..." : "Сохранить"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-text-main">{fullName}</span>
                <Badge
                  variant="secondary"
                  className="bg-brand-primary-soft text-brand-warning-strong text-[10px]"
                >
                  Ребёнок
                </Badge>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-text-muted">
                {age !== null && <span>{age} лет</span>}
                {age !== null && genderLabel && <span>•</span>}
                {genderLabel && <span>{genderLabel}</span>}
                {!age && !genderLabel && <span>Данные не заполнены</span>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Успехи */}
      <Card className="border-app-surface bg-app-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-text-main">
            <Trophy className="h-4 w-4 text-finance-pending" />
            Мои успехи
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 pt-0">
          <div className="flex flex-col rounded-xl bg-app-surface p-3">
            <span className="text-[11px] text-text-muted">Закрытых недель</span>
            <span className="text-lg font-bold text-text-main">{totalWeeks}</span>
          </div>
          <div className="flex flex-col rounded-xl bg-app-surface p-3">
            <span className="text-[11px] text-text-muted">Лучшая неделя</span>
            <span className="text-lg font-bold text-text-main">
              {bestWeek > 0 ? `${bestWeek} ₽` : "—"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Семья */}
      <Card className="border-app-surface bg-app-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-text-main">
            <CalendarDays className="h-4 w-4 text-text-muted" />
            Моя семья
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {me?.family_id ? (
            <div className="flex flex-col gap-3 mt-1">
              {familyMembers.map((member) => (
                <div key={member.id} className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.avatar_url} />
                    <AvatarFallback className="bg-app-surface text-text-main text-xs">
                      {member.first_name?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-text-main">
                      {[member.first_name, member.last_name].filter(Boolean).join(" ") ||
                        "Без имени"}
                    </span>
                    <span className="text-[11px] text-text-muted">
                      {member.role === "PARENT" ? "Родитель" : "Ребёнок"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-muted">Семья не привязана</p>
          )}
        </CardContent>
      </Card>

      <Button variant="destructive" size="sm" className="h-9 w-full mt-2" onClick={handleLogout}>
        <LogOut className="mr-1.5 h-3.5 w-3.5" />
        Выйти
      </Button>
    </div>
  )
}
