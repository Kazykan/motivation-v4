"use client"

import { useQuery } from "@tanstack/react-query"
import { parentApi } from "@/services/parentApi"
import { UserRound, Clock3 } from "lucide-react"
import { LogHistoryViewerProps, TaskLogHistoryItem } from "@/types/props"

export function LogHistoryViewer({ logId }: LogHistoryViewerProps) {
  const { data: history = [], isLoading } = useQuery<TaskLogHistoryItem[]>({
    queryKey: ["task-log-history", logId],
    queryFn: () => parentApi.getTaskLogHistory(logId),
    enabled: !!logId,
  })

  if (isLoading) {
    return <div className="text-xs text-brand-muted">Загрузка истории...</div>
  }

  if (history.length === 0) {
    return <div className="text-xs text-brand-muted">Изменений пока нет</div>
  }

  const lastChange = history[0]

  const formattedDate = lastChange?.changed_at
    ? new Date(lastChange.changed_at).toLocaleString("ru-RU", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Недавно"

  return (
    <div className="space-y-1 border-t border-brand-muted/15 pt-2">
      <div className="flex items-center gap-1.5 text-[11px] text-brand-muted">
        <UserRound className="h-3 w-3" />
        <span>Изменил: {lastChange?.changed_by_name || "Родитель"}</span>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-brand-muted">
        <Clock3 className="h-3 w-3" />
        <span>Когда: {formattedDate}</span>
      </div>
    </div>
  )
}
