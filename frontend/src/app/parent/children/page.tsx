"use client"

import { useCallback, useEffect, useState } from "react"
import { parentApi } from "@/services/parentApi"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useRequireRole } from "@/hooks/useRequireRole"
import { ChildCard } from "@/components/ChildCard"
import { InviteCodeDialog } from "@/components/auth/InviteCodeDialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Invite {
  id: number
  code: string
  expires_at: string
  is_used: boolean
}

interface FamilyMember {
  id: number
  username: string
  first_name: string
  last_name: string
  role: "PARENT" | "CHILD" | ""
  avatar_url: string | null
  gender: "MALE" | "FEMALE" | null
  birth_date: string | null
  telegram_id: number | null
  google_id: string | null
  apple_id: string | null
}

export default function ParentChildrenPage() {
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [invite, setInvite] = useState<Invite | null>(null)
  const [dialogOpen, setDialogOpen] = useState<boolean>(false)
  const { me, ready } = useRequireRole("PARENT")

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await parentApi.getFamilyMembers()
      setMembers(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Ошибка загрузки членов семьи:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    fetchMembers()
  }, [ready, fetchMembers])

  const openInviteDialog = useCallback(async () => {
    setDialogOpen(true)
    if (invite) return
    try {
      const data = await parentApi.getCurrentInvite()
      setInvite(data)
    } catch (e) {
      console.error("Не удалось получить код:", e)
    }
  }, [invite])

  const handleGenerateNew = useCallback(async () => {
    try {
      const data = await parentApi.createInvite()
      setInvite(data)
    } catch (e) {
      console.error("Не удалось создать новый код:", e)
    }
  }, [])

  if (!ready) {
    return <div className="py-12 text-center text-sm text-text-muted">Загрузка...</div>
  }

  const children = members.filter((m) => m.role === "CHILD")
  const parents = members.filter((m) => m.role === "PARENT" && m.id !== me?.id)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-text-main">Дети</h1>
        <Button
          onClick={openInviteDialog}
          className="bg-brand-primary text-brand-dark hover:bg-brand-primary-hover"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Добавить ребёнка
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="py-8 text-center text-sm text-text-muted">Загрузка списка детей...</div>
        ) : children.length === 0 ? (
          <div className="py-8 text-center text-sm text-text-muted">Список детей пуст</div>
        ) : (
          <div className="flex flex-col gap-3">
            {children.map((child) => (
              <ChildCard key={child.id} child={child} />
            ))}
          </div>
        )}
      </div>

      {parents.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-text-main">Родители</h2>
          <div className="flex flex-col gap-3">
            {parents.map((parent) => (
              <Card
                key={parent.id}
                className="rounded-2xl border-app-surface bg-app-card shadow-xs transition-all hover:shadow-md"
              >
                <CardContent className="flex items-center gap-3.5 p-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={parent.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-brand-primary-soft text-brand-warning-strong text-sm">
                      {(parent.first_name || parent.username || "?").slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold text-text-main">
                      {[parent.first_name, parent.last_name].filter(Boolean).join(" ") ||
                        parent.username}
                    </span>
                    <Badge className="w-fit bg-brand-primary-soft text-brand-warning-strong text-[10px]">
                      Родитель
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <InviteCodeDialog
        open={dialogOpen}
        code={invite?.code ?? ""}
        expiresAt={invite?.expires_at}
        onOpenChange={setDialogOpen}
        onGenerateNew={handleGenerateNew}
      />
    </div>
  )
}
