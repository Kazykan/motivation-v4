"use client"

import {
  Users,
  CheckSquare,
  ClipboardCheck,
  FileText,
  Wallet,
  User as UserIcon,
} from "lucide-react"
import { RubberDock, DockItem } from "@/components/RubberDock"
import { useLogSyncStore } from "@/store/useLogSyncStore"
import { useMe } from "@/hooks/useMe"

export function Navigation() {
  const { me, ready } = useMe()
  const isSyncing = useLogSyncStore((state) => state.isSyncing)
  const lastError = useLogSyncStore((s) => s.lastError)
  const clearError = useLogSyncStore((s) => s.clearError)

  if (!ready || !me?.onboarded) return null

  const role = me.role

  const parentNav: DockItem[] = [
    { label: "Дети", href: "/parent/children", icon: Users },
    { label: "Задания", href: "/parent/tasks", icon: CheckSquare },
    { label: "Проверка", href: "/parent/review", icon: ClipboardCheck },
    { label: "Отчеты", href: "/parent/reports", icon: FileText },
  ]

  const childNav: DockItem[] = [
    { label: "Задания", href: "/child/tasks", icon: CheckSquare },
    { label: "Кошелёк", href: "/child/balance", icon: Wallet },
    { label: "Профиль", href: "/child/profile", icon: UserIcon },
  ]

  const currentNav = role === "PARENT" ? parentNav : childNav

  return (
    <>
      {isSyncing && (
        <div className="fixed bottom-24 right-4 z-50 flex items-center gap-1.5 rounded-full border border-finance-pending bg-finance-pending/10 px-2.5 py-0.5 text-[10px] font-medium text-finance-pending shadow-xs backdrop-blur-sm">
          <span className="h-2 w-2 animate-ping rounded-full bg-finance-pending" />
          Сохранение...
        </div>
      )}
      {lastError && (
        <button
          onClick={clearError}
          className="fixed bottom-32 right-4 z-50 max-w-[280px] rounded-lg border border-finance-negative/40 bg-finance-negative/10 px-3 py-1.5 text-left text-[11px] font-medium text-finance-negative shadow-sm backdrop-blur-sm"
        >
          {lastError}
        </button>
      )}

      <RubberDock items={currentNav} />
    </>
  )
}
