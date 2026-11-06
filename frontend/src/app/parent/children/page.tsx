"use client"

import { useCallback, useEffect, useState } from "react"
import { parentApi } from "@/services/parentApi"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useRequireRole } from "@/hooks/useRequireRole"
import { ChildCard } from "@/components/ChildCard"
import { InviteCodeDialog } from "@/components/auth/InviteCodeDialog"

interface Invite {
  id: number
  code: string
  expires_at: string
  is_used: boolean
}

export default function ParentChildrenPage() {
  const [children, setChildren] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [invite, setInvite] = useState<Invite | null>(null)
  const [dialogOpen, setDialogOpen] = useState<boolean>(false)
  const { ready } = useRequireRole("PARENT")

  const fetchChildren = useCallback(async () => {
    setLoading(true)
    try {
      const data = await parentApi.getChildren()
      setChildren(data)
    } catch (error) {
      console.error("Ошибка загрузки детей:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    fetchChildren()
  }, [ready, fetchChildren])

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
    return <div className="py-12 text-center text-sm text-brand-muted">Загрузка...</div>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-brand-dark">Дети</h1>
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
          <div className="py-8 text-center text-sm text-brand-muted">Загрузка списка детей...</div>
        ) : children.length === 0 ? (
          <div className="py-8 text-center text-sm text-brand-muted">Список детей пуст</div>
        ) : (
          <div className="flex flex-col gap-3">
            {children.map((child: any) => (
              <ChildCard key={child.id} child={child} />
            ))}
          </div>
        )}
      </div>

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
