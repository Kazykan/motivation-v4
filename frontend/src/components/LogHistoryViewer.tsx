"use client"

import { useQuery } from "@tanstack/react-query"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
    return <div className="text-xs text-text-muted">Загрузка истории...</div>
  }

  if (history.length === 0) {
    return <div className="text-xs text-text-muted">Изменений пока нет</div>
  }

  const roleLabel = (role: string | null | undefined) => {
    if (role === "PARENT") return "Родитель"
    if (role === "CHILD") return "Ребёнок"
    return ""
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
    <div className="space-y-1 border-t border-app-surface pt-2">
      <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
        <Avatar className="h-4 w-4">
          <AvatarImage src={lastChange?.changed_by_avatar ?? undefined} />
          <AvatarFallback className="text-[8px]">
            {(lastChange?.changed_by_name || "?").slice(0, 1)}
          </AvatarFallback>
        </Avatar>
        <span>
          Изменил: {lastChange?.changed_by_name || "—"}
          {lastChange?.changed_by_role ? ` (${roleLabel(lastChange.changed_by_role)})` : ""}
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
        <Clock3 className="h-3 w-3" />
        <span>Когда: {formattedDate}</span>
      </div>
    </div>
  )
}
