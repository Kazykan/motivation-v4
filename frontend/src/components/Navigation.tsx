"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Users,
  CheckSquare,
  ClipboardCheck,
  FileText,
  Wallet,
  User as UserIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
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

  const parentNav = [
    { label: "Дети", href: "/parent/children", icon: Users },
    { label: "Задания", href: "/parent/tasks", icon: CheckSquare },
    { label: "Проверка", href: "/parent/review", icon: ClipboardCheck },
    { label: "Отчеты", href: "/parent/reports", icon: FileText },
  ]

  const childNav = [
    { label: "Задания", href: "/child/tasks", icon: CheckSquare },
    { label: "Кошелёк", href: "/child/balance", icon: Wallet },
    { label: "Профиль", href: "/child/profile", icon: UserIcon },
  ]

  const currentNav = role === "PARENT" ? parentNav : childNav

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-app-surface bg-app-card/90 backdrop-blur-lg">
      <nav className="fixed bottom-0 left-1/2 z-20 w-full max-w-md -translate-x-1/2 bg-app-bg pb-[env(safe-area-inset-bottom)] shadow-[var(--shadow-float)]">
        <div className="flex h-14 items-center justify-around px-4">
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

          {currentNav.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 text-[11px] font-medium transition-all",
                  isActive
                    ? "text-text-main font-semibold"
                    : "text-text-muted hover:text-text-main",
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-2xl transition-all",
                    isActive
                      ? "bg-brand-action text-brand-action-text shadow-md"
                      : "bg-transparent",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
