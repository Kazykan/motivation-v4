// src/store/useLogSyncStore.ts
import { create } from "zustand"
import { parentApi } from "@/services/parentApi"

interface LogChange {
  logId?: number | null
  taskId: number
  date: string
  status: "DONE" | "APPROVED" | "REJECTED"
}

interface LogSyncState {
  buffer: Record<string, LogChange> // ключ: `${taskId}-${date}` или `logId-${logId}`
  isSyncing: boolean
  timerId: NodeJS.Timeout | null
  queueChange: (change: LogChange, queryClient: any) => void
  syncWithBackend: () => Promise<void>
}

export const useLogSyncStore = create<LogSyncState>((set, get) => ({
  buffer: {},
  isSyncing: false,
  timerId: null,

  queueChange: (change, queryClient) => {
    const key = change.logId ? `log_${change.logId}` : `task_${change.taskId}_${change.date}`

    set((state) => ({
      buffer: { ...state.buffer, [key]: change },
    }))

    const currentTimer = get().timerId
    if (currentTimer) clearTimeout(currentTimer)

    const newTimer = setTimeout(async () => {
      await get().syncWithBackend()
      queryClient.invalidateQueries({ queryKey: ["weekly-review"] })
    }, 500)

    set({ timerId: newTimer })
  },

  syncWithBackend: async () => {
    const { buffer } = get()
    if (Object.keys(buffer).length === 0) return

    set({ isSyncing: true })

    try {
      const changes = Object.values(buffer)

      // Отправка запросов пачкой
      await Promise.all(
        changes.map(async (item) => {
          if (item.logId) {
            return parentApi.updateTaskLogStatus(item.logId, item.status)
          } else {
            return parentApi.createTaskLog({
              task: item.taskId,
              date: item.date,
              status: item.status,
            })
          }
        }),
      )

      set({ buffer: {}, isSyncing: false, timerId: null })
    } catch (error) {
      console.error("Ошибка синхронизации логов:", error)
      set({ isSyncing: false })
    }
  },
}))
