"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface WeekNavigatorProps {
  weekStart: string
  weekEnd: string
  onPrev: () => void
  onNext: () => void
  disableNext?: boolean
}

const fmtRange = (start: string, end: string) => {
  const s = new Date(`${start}T12:00:00`)
  const e = new Date(`${end}T12:00:00`)
  const sameMonth = s.getMonth() === e.getMonth()
  const sLabel = s.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
  const eLabel = e.toLocaleDateString(
    "ru-RU",
    sameMonth ? { day: "numeric" } : { day: "numeric", month: "short" },
  )
  return `${sLabel} – ${eLabel} ${e.getFullYear()}`
}

export function WeekNavigator({
  weekStart,
  weekEnd,
  onPrev,
  onNext,
  disableNext = false,
}: WeekNavigatorProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-2 py-1.5">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onPrev}
        aria-label="Предыдущая неделя"
        className="cursor-pointer"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <span className="text-sm font-semibold text-slate-900">{fmtRange(weekStart, weekEnd)}</span>

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onNext}
        disabled={disableNext}
        aria-label="Следующая неделя"
        className="cursor-pointer"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
