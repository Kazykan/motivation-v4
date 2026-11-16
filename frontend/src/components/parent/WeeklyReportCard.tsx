"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronRight, CheckCircle2, Clock3 } from "lucide-react"
import { formatMoney } from "@/lib/money"
import { cn } from "@/lib/utils"

export interface WeeklyReportItem {
  id: number | null
  child: number
  start_date: string
  end_date: string
  status: "DRAFT" | "REVIEW" | "CLOSED"
  calculated_amount: string
  manual_adjustment: string
  total_paid: string
  final_sum: string
  is_payout_confirmed: boolean
  can_close: boolean
  has_pending_tasks?: boolean
}

interface WeeklyReportCardProps {
  report: WeeklyReportItem
  childName: string
  childAvatar?: string | null
  onCloseWeek?: (report: WeeklyReportItem) => void
  isClosing?: boolean
}

export function WeeklyReportCard({
  report,
  childName,
  childAvatar,
  onCloseWeek,
  isClosing = false,
}: WeeklyReportCardProps) {
  const isClosed = report.status === "CLOSED" || report.is_payout_confirmed
  const adjustment = Number(report.manual_adjustment || 0)
  const finalAmount = isClosed ? report.total_paid : report.final_sum

  return (
    <Card className="rounded-card border-app-surface bg-app-card py-0 shadow-xs">
      <CardContent className="flex flex-col gap-4 p-4">
        {/* Шапка: аватар, имя и статус */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={childAvatar ?? undefined} />
              <AvatarFallback className="bg-brand-primary-soft text-sm font-bold text-brand-warning-strong">
                {(childName || "?").slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-base font-bold text-text-main">{childName}</span>
          </div>

          <Badge
            variant="secondary"
            className={cn(
              "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
              isClosed
                ? "bg-brand-success-soft text-brand-success-strong"
                : "bg-brand-primary text-brand-action-text",
            )}
          >
            {isClosed ? "Выплачено" : "Ждёт проверки"}
          </Badge>
        </div>

        {/* Финансовые показатели */}
        <div className="grid grid-cols-3 gap-2 border-t border-app-surface pt-3 tabular-nums">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-text-muted">Заработано</span>
            <span className="text-sm font-bold text-text-main">
              {formatMoney(report.calculated_amount)}
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-text-muted">Корректировка</span>
            <span
              className={cn(
                "text-sm font-bold",
                adjustment < 0 ? "text-finance-negative" : "text-finance-positive",
              )}
            >
              {adjustment >= 0 ? `+${formatMoney(adjustment)}` : formatMoney(adjustment)}
            </span>
          </div>

          <div className="flex flex-col gap-0.5 text-right">
            <span className="text-[11px] text-text-muted">К выплате</span>
            <span className="text-sm font-bold text-text-main">{formatMoney(finalAmount)}</span>
          </div>
        </div>

        {/* Действия */}
        {!isClosed && (
          <div className="flex flex-col gap-2">
            <Link
              href={`/parent/review?child_id=${report.child}&week_start=${report.start_date}`}
              className="flex min-h-10 items-center justify-between gap-2 rounded-button bg-brand-warning-soft px-3 py-2 text-xs font-semibold text-brand-warning-strong transition-colors hover:bg-brand-warning-soft/80"
            >
              <span className="leading-snug">Проверить задания ребёнка</span>
              <ChevronRight className="h-4 w-4 shrink-0" />
            </Link>

            <Button
              type="button"
              disabled={!report.can_close || isClosing}
              onClick={() => onCloseWeek?.(report)}
              className={cn(
                "h-auto min-h-10 w-full whitespace-normal rounded-button px-3 py-2 text-center text-xs font-semibold leading-snug",
                report.can_close
                  ? "bg-brand-action text-brand-action-text hover:bg-brand-action-hover"
                  : "bg-app-surface text-text-muted opacity-100",
              )}
            >
              {report.can_close ? (
                <>
                  <CheckCircle2 className="mr-1.5 h-4 w-4 shrink-0" />
                  {isClosing ? "Закрываем..." : "Закрыть неделю и выплатить"}
                </>
              ) : (
                <>
                  <Clock3 className="mr-1.5 h-4 w-4 shrink-0" />
                  Закрытие после окончания недели
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
