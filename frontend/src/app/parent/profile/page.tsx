"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { LogOut, Pencil, Check, X, Users, UserPlus } from "lucide-react"

import { useMe } from "@/hooks/useMe"
import { useFamilyMembers } from "@/hooks/useChildren"
import { authApi } from "@/services/authApi"
import { parentApi } from "@/services/parentApi"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { PushNotificationSettings } from "@/components/PushNotificationSettings"
import { InviteCodeDialog } from "@/components/auth/InviteCodeDialog"

export default function ParentProfilePage() {
  const { me, ready } = useMe()
  const queryClient = useQueryClient()
  const { members } = useFamilyMembers()

  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ first_name: "", last_name: "" })
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteData, setInviteData] = useState<{ code: string; expires_at?: string } | null>(null)

  const generateInviteMutation = useMutation({
    mutationFn: () => parentApi.createInvite(),
    onSuccess: (data) => {
      setInviteData(data)
    },
  })

  const handleOpenInvite = () => {
    setInviteOpen(true)
    if (!inviteData) {
      generateInviteMutation.mutate()
    }
  }

  const updateProfileMutation = useMutation({
    mutationFn: (data: { first_name: string; last_name: string }) => authApi.updateMe(data),
    onSuccess: (updatedData) => {
      queryClient.setQueryData(["me"], updatedData)
      queryClient.invalidateQueries({ queryKey: ["me"] })
      queryClient.invalidateQueries({ queryKey: ["family-members"] })
      setIsEditing(false)
    },
  })

  const handleLogout = async () => {
    await fetch("/bff/auth/logout", { method: "POST" })
    window.location.href = "/"
  }

  const startEditing = () => {
    setEditForm({
      first_name: me?.first_name || "",
      last_name: me?.last_name || "",
    })
    setIsEditing(true)
  }

  const saveProfile = () => {
    updateProfileMutation.mutate({
      first_name: editForm.first_name.trim(),
      last_name: editForm.last_name.trim(),
    })
  }

  if (!ready) {
    return <div className="py-8 text-center text-sm text-text-muted">Загрузка профиля...</div>
  }

  const fullName = [me?.first_name, me?.last_name].filter(Boolean).join(" ") || "Родитель"
  const initials =
    [me?.first_name?.[0], me?.last_name?.[0]].filter(Boolean).join("").toUpperCase() || "?"

  return (
    <div className="flex flex-col gap-6">
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

      {/* Карточка родителя */}
      <Card className="rounded-card border-app-surface bg-app-card shadow-sm">
        <CardContent className="flex items-start gap-4 p-4">
          <Avatar className="h-16 w-16 shrink-0 rounded-2xl">
            <AvatarImage src={me?.avatar_url ?? undefined} />
            <AvatarFallback className="rounded-2xl bg-brand-primary-soft text-lg font-semibold text-brand-warning-strong">
              {initials}
            </AvatarFallback>
          </Avatar>

          {isEditing ? (
            <div className="flex flex-1 flex-col gap-3">
              <div className="flex flex-col gap-2">
                <Input
                  placeholder="Имя"
                  value={editForm.first_name}
                  onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                  className="h-9 rounded-input bg-app-surface"
                />
                <Input
                  placeholder="Фамилия"
                  value={editForm.last_name}
                  onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                  className="h-9 rounded-input bg-app-surface"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  className="h-8 text-text-muted"
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  Отмена
                </Button>
                <Button
                  size="sm"
                  onClick={saveProfile}
                  disabled={updateProfileMutation.isPending || !editForm.first_name.trim()}
                  className="h-8 rounded-button bg-brand-action text-brand-action-text hover:bg-brand-action-hover"
                >
                  <Check className="mr-1 h-3.5 w-3.5" />
                  {updateProfileMutation.isPending ? "Сохранение..." : "Сохранить"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 pt-1">
              <span className="text-lg font-bold leading-tight text-text-main">{fullName}</span>
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="bg-brand-primary-soft text-brand-warning-strong"
                >
                  Родитель
                </Badge>
                {me?.family_name && (
                  <span className="text-xs text-text-muted">{me.family_name}</span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Семья */}
      <Card className="rounded-card border-app-surface bg-app-card shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-text-main">
              <Users className="h-4 w-4 text-text-muted" />
              Моя семья
            </CardTitle>
            {me?.family_id && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenInvite}
                className="h-7 gap-1 px-2 text-xs text-text-main hover:bg-app-surface"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Пригласить
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {me?.family_id ? (
            <div className="mt-1 flex flex-col gap-3">
              {members.map((member: any) => {
                const memberName =
                  [member.first_name, member.last_name].filter(Boolean).join(" ") || "Без имени"
                return (
                  <div key={member.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={member.avatar_url ?? undefined} />
                        <AvatarFallback className="bg-app-surface text-xs font-medium text-text-main">
                          {memberName.slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-text-main">{memberName}</span>
                        <span className="text-xs text-text-muted">
                          {member.role === "PARENT" ? "Родитель" : "Ребёнок"}
                        </span>
                      </div>
                    </div>
                    {member.id === me.id && (
                      <Badge variant="secondary" className="bg-app-surface text-text-muted">
                        Вы
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-text-muted">Семья не привязана</p>
          )}
        </CardContent>
      </Card>

      <PushNotificationSettings />

      <Separator />

      <Button variant="destructive" className="h-10 w-full rounded-button" onClick={handleLogout}>
        <LogOut className="mr-2 h-4 w-4" />
        Выйти из аккаунта
      </Button>

      <InviteCodeDialog
        open={inviteOpen}
        code={inviteData?.code ?? ""}
        expiresAt={inviteData?.expires_at}
        onOpenChange={setInviteOpen}
        onGenerateNew={async () => {
          await generateInviteMutation.mutateAsync()
        }}
      />
    </div>
  )
}
