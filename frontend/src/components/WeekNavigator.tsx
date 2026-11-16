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
  const sLabel = s.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }).replace(".", "")
  const eLabel = e.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }).replace(".", "")
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
    <div className="flex items-center justify-between rounded-card border border-app-surface bg-app-card px-2 py-1.5 shadow-xs">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onPrev}
        aria-label="Предыдущая неделя"
        className="cursor-pointer rounded-button text-text-main hover:bg-app-surface"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <span className="text-sm font-semibold text-text-main tabular-nums">
        {fmtRange(weekStart, weekEnd)}
      </span>

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onNext}
        disabled={disableNext}
        aria-label="Следующая неделя"
        className="cursor-pointer rounded-button text-text-main hover:bg-app-surface"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
