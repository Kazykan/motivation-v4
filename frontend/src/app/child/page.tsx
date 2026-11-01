"use client"

import { useEffect, useState } from "react"
import { parentApi } from "@/services/parentApi"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { ChildCard } from "@/components/ChildCard"
import { InviteCodeDialog } from "@/components/auth/InviteCodeDialog"

export default function ParentChildrenPage() {
  const [children, setChildren] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [inviteCode, setInviteCode] = useState<string>("")
  const [dialogOpen, setDialogOpen] = useState<boolean>(false)

  const fetchChildren = async () => {
    try {
      const data = await parentApi.getChildren()
      setChildren(data)
    } catch (error) {
      console.error("Ошибка загрузки детей:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchChildren()
  }, [])

  const openInviteDialog = async () => {
    // Получить актуальный код можно из /api/auth/me (invite_code)
    // либо создать через parentApi.createInvite() — если эндпоинт есть.
    // Пока используем значение из /me.
    try {
      const res = await fetch("/api/auth/me")
      const me = await res.json()
      setInviteCode(me.invite_code ?? "")
    } catch (e) {
      console.error("Не удалось получить код:", e)
    }
    setDialogOpen(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Дети</h1>
        <Button
          onClick={openInviteDialog}
          className="bg-amber-400 text-slate-900 hover:bg-amber-500"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Добавить ребёнка
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="py-8 text-center text-sm text-slate-500">Загрузка списка детей...</div>
        ) : children.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">Список детей пуст</div>
        ) : (
          <div className="flex flex-col gap-3">
            {children.map((child: any) => (
              <ChildCard key={child.id} child={child} />
            ))}
          </div>
        )}
      </div>

      <InviteCodeDialog open={dialogOpen} code={inviteCode} onOpenChange={setDialogOpen} />
    </div>
  )
}
