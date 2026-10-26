"use client"

import { useEffect, useState } from "react"
import { parentApi } from "@/services/parentApi"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Plus, Copy, Check } from "lucide-react"
import { ChildCard } from "@/components/ChildCard"

export default function ParentChildrenPage() {
  const [children, setChildren] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [inviteCode, setInviteCode] = useState<string>("7241")
  const [copied, setCopied] = useState<boolean>(false)

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

  const copyCode = () => {
    navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const generateNewCode = () => {
    const randomCode = Math.floor(1000 + Math.random() * 9000).toString()
    setInviteCode(randomCode)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Дети</h1>
        <Dialog>
          {/* Убран asChild, чтобы не плодить вложенные теги <button> */}
          <DialogTrigger className="inline-flex items-center justify-center h-8 px-3 rounded-lg text-sm font-medium bg-amber-400 text-slate-900 hover:bg-amber-500 cursor-pointer transition-colors">
            <Plus className="mr-1.5 h-4 w-4" />
            Добавить ребенка
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Приглашение ребенка</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-2">
                <span className="text-xs text-slate-500">
                  Код приглашения для входа в приложение:
                </span>
                <div className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 p-4 text-white">
                  {inviteCode.split("").map((digit, idx) => (
                    <span key={idx} className="text-2xl font-bold tracking-widest text-amber-400">
                      {digit}
                    </span>
                  ))}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:text-amber-400 ml-2"
                    onClick={copyCode}
                  >
                    {copied ? (
                      <Check className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <Copy className="h-5 w-5" />
                    )}
                  </Button>
                </div>
                <span className="text-[11px] text-slate-400 text-center">
                  Действует до 25.10.2025 • 7 дней
                </span>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={generateNewCode}
                className="w-full bg-amber-400 text-slate-900 hover:bg-amber-500"
              >
                Сгенерировать новый
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
    </div>
  )
}
