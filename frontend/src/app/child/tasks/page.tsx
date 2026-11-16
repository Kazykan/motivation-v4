"use client"

import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { childApi } from "@/services/childApi"
import { useLogSyncStore } from "@/store/useLogSyncStore"
import { ChildTaskCard } from "@/components/child/ChildTaskCard"
import { WeekNavigator } from "@/components/WeekNavigator"
import { CardContent } from "@/components/ui/card"
import { getMonday, addWeeks, toISODate, getWeekEnd } from "@/lib/week"
import { formatMoney } from "@/lib/money"
import { LogStatusValue, ChildWeeklyItem } from "@/types/props"
import { Check, ClipboardList, Clock3, Wallet } from "lucide-react"
import Link from "next/link"
import { useRequireProfile } from "@/hooks/useRequireProfile"

function normalizeItem(raw: any): ChildWeeklyItem {
  return {
    ...raw,
    weeklyPrice: raw.weeklyPrice ?? 0,
    targetCount: raw.targetCount ?? 0,
    targetDays: Array.isArray(raw.targetDays) ? raw.targetDays : [],
    logs: Array.isArray(raw.logs) ? raw.logs : [],
    weekClosed: !!raw.weekClosed,
    summary: raw.summary ?? {
      approvedCount: 0,
      pendingCount: 0,
      rejectedCount: 0,
      calculatedAmount: 0,
    },
  }
}

export default function ChildTasksPage() {
  const queryClient = useQueryClient()
  const { queueChange } = useLogSyncStore()
  const { me, ready: profileReady } = useRequireProfile()
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()))
  const weekStartIso = toISODate(weekStart)
  const weekEndIso = toISODate(getWeekEnd(weekStart))

  const childId = me?.id

  const { data: items = [], isLoading } = useQuery<ChildWeeklyItem[]>({
    queryKey: ["child-weekly-review", childId, weekStartIso],
    enabled: !!childId,
    queryFn: async () => {
      const raw = await childApi.getWeeklyReview(weekStartIso)
      return (Array.isArray(raw) ? raw : []).map(normalizeItem)
    },
  })

  const nextDisabled = useMemo(() => weekStart >= getMonday(new Date()), [weekStart])

  const handleChangeStatus = async (
    logId: number | null,
    status: LogStatusValue,
    taskId: number,
    date: string,
  ) => {
    const key = ["child-weekly-review", childId, weekStartIso]

    const updateCache = (oldData: any) => {
      if (!oldData) return oldData
      return (oldData as ChildWeeklyItem[]).map((item) => {
        if (item.taskId !== taskId || item.weekClosed) return item
        const idx = item.logs.findIndex((l) => l.date === date)
        const nextLogs = [...item.logs]

        const runs = item.targetCount || (item.targetDays?.length ?? 1) || 1
        const pricePerRun = Number(item.weeklyPrice) / runs
        const earnedAmount = status === "CANCELLED" || status === "REJECTED" ? 0 : pricePerRun

        if (idx >= 0) {
          nextLogs[idx] = { ...nextLogs[idx], status, earned_amount: earnedAmount }
        } else {
          nextLogs.push({ id: -Date.now(), date, status, earned_amount: earnedAmount })
        }

        return { ...item, logs: nextLogs }
      })
    }

    queryClient.setQueryData(key, updateCache)
    queueChange({ logId, taskId, date, status }, queryClient)
  }

  const totals = useMemo(() => {
    let canEarn = 0
    let earned = 0
    let pending = 0

    for (const item of items) {
      const isFlexible = item.scheduleType === "FLEXIBLE"
      const plannedRuns = isFlexible
        ? Math.max(item.targetCount ?? 0, 1)
        : Math.max(item.targetDays?.length ?? 0, 1)
      const pricePerRun = Number(item.weeklyPrice) / plannedRuns

      canEarn += Number(item.weeklyPrice)

      for (const log of item.logs) {
        if (log.status === "APPROVED") {
          earned += Number(log.earned_amount ?? 0)
        } else if (log.status === "DONE") {
          pending += pricePerRun
        }
      }
    }

    return { canEarn, earned, pending, canStillEarn: Math.max(0, canEarn - earned - pending) }
  }, [items])

  if (!profileReady) {
    return <div className="py-12 text-center text-sm text-text-muted">Загрузка...</div>
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight text-text-main">Мои задания</h1>
          <Link
            href="/child/balance"
            className="text-xs font-medium text-brand-action-hover hover:text-brand-action-text"
          >
            Кошелёк →
          </Link>
        </div>

        <WeekNavigator
          weekStart={weekStartIso}
          weekEnd={weekEndIso}
          onPrev={() => setWeekStart((d) => addWeeks(d, -1))}
          onNext={() => !nextDisabled && setWeekStart((d) => addWeeks(d, 1))}
          disableNext={nextDisabled}
        />

        {/* Сводка недели — светлая карточка */}
        <div className="rounded-card bg-app-card p-5 shadow-sm border border-app-surface">
          <CardContent className="p-0">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-finance-positive/10 text-finance-positive">
                <Wallet className="h-6 w-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-text-main leading-tight">
                  Моя неделя
                </span>
                <span className="text-[11px] text-text-muted">Заданий: {items.length}</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] uppercase tracking-wide text-text-muted">
                  Заработано
                </span>
                <span className="flex items-center justify-center gap-1 text-sm font-semibold text-finance-positive tabular-nums">
                  <Check className="h-3 w-3 stroke-[2.5]" />
                  {formatMoney(totals.earned)}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] uppercase tracking-wide text-text-muted">
                  Ждёт проверки
                </span>
                <span className="flex items-center justify-center gap-1 text-sm font-semibold text-finance-pending tabular-nums">
                  <Clock3 className="h-3 w-3" />
                  {formatMoney(totals.pending)}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] uppercase tracking-wide text-text-muted">
                  Можно ещё
                </span>
                <span className="text-sm font-semibold text-text-main tabular-nums">
                  {formatMoney(totals.canStillEarn)}
                </span>
              </div>
            </div>
          </CardContent>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-main">Задания на неделю</h2>
          <span className="text-xs text-text-muted">Все ({items.length})</span>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-sm text-text-muted">Загрузка заданий...</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-card border border-app-surface bg-app-card p-6 text-center shadow-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-app-surface text-text-muted">
              <ClipboardList className="h-8 w-8" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-base font-semibold text-text-main">Пока нечего выполнять</p>
              <p className="max-w-[18rem] text-sm leading-relaxed text-text-muted">
                Родитель ещё не назначил тебе заданий на эту неделю.
                <br />
                Попроси добавить задание — за каждое выполнение начисляются деньги.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <ChildTaskCard key={item.taskId} item={item} onChangeStatus={handleChangeStatus} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
