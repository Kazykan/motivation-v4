import { create } from "zustand"
import type { QueryClient } from "@tanstack/react-query"
import { parentApi } from "@/services/parentApi"
import { LogStatusValue } from "@/types/props"

interface LogChange {
  logId?: number | null
  taskId: number
  date: string
  status: LogStatusValue
}

interface LogSyncState {
  buffer: Record<string, LogChange>
  isSyncing: boolean
  timerId: ReturnType<typeof setTimeout> | null
  queryClient: QueryClient | null
  queueChange: (change: LogChange, queryClient: QueryClient) => void
  syncWithBackend: () => Promise<void>
}

const isNewLog = (logId?: number | null) => logId == null || logId <= 0

const getChangeKey = (change: LogChange) =>
  isNewLog(change.logId) ? `task_${change.taskId}_${change.date}` : `log_${change.logId}`

export const useLogSyncStore = create<LogSyncState>((set, get) => ({
  buffer: {},
  isSyncing: false,
  timerId: null,
  queryClient: null,

  queueChange: (change, queryClient) => {
    const key = getChangeKey(change)

    set((state) => ({
      buffer: { ...state.buffer, [key]: change },
      queryClient,
    }))

    const currentTimer = get().timerId
    if (currentTimer) clearTimeout(currentTimer)

    const timer = setTimeout(() => {
      void get().syncWithBackend()
    }, 500)

    set({ timerId: timer })
  },

  syncWithBackend: async () => {
    if (get().isSyncing) return

    const snapshot = get().buffer
    const entries = Object.entries(snapshot)
    if (entries.length === 0) return

    const currentTimer = get().timerId
    if (currentTimer) clearTimeout(currentTimer)

    set({ isSyncing: true, timerId: null })

    const succeeded = new Set<string>()

    try {
      for (const [key, item] of entries) {
        if (isNewLog(item.logId)) {
          if (item.status !== "CANCELLED") {
            await parentApi.createTaskLog({
              task: item.taskId,
              date: item.date,
              status: item.status,
            })
          }
        } else {
          await parentApi.updateTaskLogStatus(item.logId!, item.status)
        }

        succeeded.add(key)
      }
    } catch (error) {
      console.error("Ошибка синхронизации логов:", error)
    } finally {
      const pendingTimer = get().timerId
      if (pendingTimer) clearTimeout(pendingTimer)

      set((state) => {
        const nextBuffer = { ...state.buffer }

        for (const key of succeeded) {
          if (nextBuffer[key] === snapshot[key]) {
            delete nextBuffer[key]
          }
        }

        return {
          buffer: nextBuffer,
          isSyncing: false,
          timerId: null,
        }
      })

      const queryClient = get().queryClient

      if (succeeded.size > 0 && queryClient) {
        await queryClient.invalidateQueries({ queryKey: ["weekly-review"] })
      }

      if (Object.keys(get().buffer).length > 0) {
        const timer = setTimeout(() => {
          void get().syncWithBackend()
        }, 1000)

        set({ timerId: timer })
      }
    }
  },
}))
