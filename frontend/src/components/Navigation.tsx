"use client"

import { usePathname } from "next/navigation"
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
  const pathname = usePathname()
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
    // Убрали внешний div с border-t, оставили один fixed-контейнер
    <nav className="pointer-events-none fixed bottom-0 left-1/2 z-50 w-full max-w-md -translate-x-1/2 pb-[env(safe-area-inset-bottom)]">
      <div className="pointer-events-auto relative flex h-[76px] items-center justify-center px-4">
        {isSyncing && (
          <div className="absolute right-4 -top-8 flex items-center gap-1.5 rounded-full border border-finance-pending bg-finance-pending/10 px-2.5 py-0.5 text-[10px] font-medium text-finance-pending shadow-xs">
            <span className="h-2 w-2 animate-ping rounded-full bg-finance-pending" />
            Сохранение...
          </div>
        )}
        {lastError && (
          <button
            onClick={clearError}
            className="absolute right-4 -top-14 max-w-[280px] rounded-lg border border-finance-negative/40 bg-finance-negative/10 px-3 py-1.5 text-left text-[11px] font-medium text-finance-negative shadow-sm"
          >
            {lastError}
          </button>
        )}

        <RubberDock items={currentNav} />
      </div>
    </nav>
  )
}
