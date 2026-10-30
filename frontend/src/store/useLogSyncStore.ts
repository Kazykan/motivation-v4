// frontend/src/store/useLogSyncStore.ts
import { create } from "zustand"
import { parentApi } from "@/services/parentApi"

interface LogChange {
  logId?: number | null
  taskId: number
  date: string
  status: "DONE" | "APPROVED" | "REJECTED" | "CANCELLED"
}

interface LogSyncState {
  buffer: Record<string, LogChange>
  isSyncing: boolean
  timerId: NodeJS.Timeout | null
  queryClient: any | null
  queueChange: (change: LogChange, queryClient: any) => void
  syncWithBackend: () => Promise<void>
}

export const useLogSyncStore = create<LogSyncState>((set, get) => ({
  buffer: {},
  isSyncing: false,
  timerId: null,
  queryClient: null,

  queueChange: (change, queryClient) => {
    const key = change.logId ? `log_${change.logId}` : `task_${change.taskId}_${change.date}`

    set((state) => ({
      buffer: { ...state.buffer, [key]: change },
      queryClient: queryClient || state.queryClient,
    }))

    const currentTimer = get().timerId
    if (currentTimer) clearTimeout(currentTimer)

    const newTimer = setTimeout(async () => {
      await get().syncWithBackend()
    }, 500)

    set({ timerId: newTimer })
  },

  syncWithBackend: async () => {
    const { buffer, queryClient } = get()
    if (Object.keys(buffer).length === 0) return

    set({ isSyncing: true })

    try {
      const changes = Object.values(buffer)

      for (const item of changes) {
        if (!item.logId) {
          await parentApi.createTaskLog({
            task: item.taskId,
            date: item.date,
            status: item.status,
          })
        } else {
          await parentApi.updateTaskLogStatus(item.logId, item.status)
        }
      }

      set({ buffer: {}, isSyncing: false, timerId: null })

      if (queryClient) {
        queryClient.invalidateQueries({ queryKey: ["weekly-review"] })
      }
    } catch (error) {
      console.error("Ошибка синхронизации логов:", error)
      set({ isSyncing: false })
    }
  },
}))
