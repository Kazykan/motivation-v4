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
import { Button } from "@/components/ui/button"

export function Navigation() {
  const pathname = usePathname()
  // Переключатель роли для локальной отладки без бэкенда/авторизации
  const [role, setRole] = useState<"PARENT" | "CHILD">("PARENT")

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
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/90 backdrop-blur-md">
      {/* Панель локальной отладки роли */}
      <div className="flex justify-center border-b border-slate-100 py-1 bg-amber-100/50 text-[10px]">
        <span className="mr-2 self-center font-medium text-slate-600">Режим тестирования:</span>
        <Button
          variant={role === "PARENT" ? "default" : "ghost"}
          size="sm"
          className="h-5 rounded-full px-2 text-[10px]"
          onClick={() => setRole("PARENT")}
        >
          Родитель
        </Button>
        <Button
          variant={role === "CHILD" ? "default" : "ghost"}
          size="sm"
          className="h-5 rounded-full px-2 text-[10px]"
          onClick={() => setRole("CHILD")}
        >
          Ребенок
        </Button>
      </div>

      {/* Элементы нижней навигации */}
      <nav className="mx-auto flex max-w-md items-center justify-around py-2">
        {currentNav.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 text-xs font-medium transition-colors",
                isActive ? "text-amber-500" : "text-slate-400 hover:text-slate-600",
              )}
            >
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl",
                  isActive ? "bg-amber-400 text-slate-900" : "bg-transparent",
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
