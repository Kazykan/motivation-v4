"use client"

import { useState } from "react"
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

export function Navigation() {
  const pathname = usePathname()
  const [role] = useState<"PARENT" | "CHILD">("PARENT")
  const isSyncing = useLogSyncStore((state) => state.isSyncing)

  const parentNav = [
    { label: "Дети", href: "/parent/children", icon: Users },
    { label: "Задания", href: "/parent/tasks", icon: CheckSquare },
    { label: "Проверка", href: "/parent/review", icon: ClipboardCheck },
    { label: "Отчеты", href: "/parent/reports", icon: FileText },
  ]

  const childNav = [
    { label: "Задания", href: "/child/tasks", icon: CheckSquare },
    { label: "Баланс", href: "/child/balance", icon: Wallet },
    { label: "Профиль", href: "/child/profile", icon: UserIcon },
  ]

  const currentNav = role === "PARENT" ? parentNav : childNav

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-brand-muted/10 bg-white/90 backdrop-blur-lg">
      <nav className="relative mx-auto flex max-w-md items-center justify-around px-2 py-2">
        {isSyncing && (
          <div className="absolute right-4 -top-8 flex items-center gap-1.5 rounded-full border border-brand-warning bg-brand-warning-soft px-2.5 py-0.5 text-[10px] font-medium text-brand-warning-strong shadow-xs">
            <span className="h-2 w-2 animate-ping rounded-full bg-brand-warning" />
            Сохранение...
          </div>
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
                  ? "text-brand-dark font-semibold"
                  : "text-brand-muted hover:text-brand-dark",
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-2xl transition-all",
                  isActive ? "bg-brand-dark text-brand-primary shadow-md" : "bg-transparent",
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
