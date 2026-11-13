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
  /** Последняя «постоянная» ошибка валидации, чтобы UI мог её показать. */
  lastError: string | null
  queueChange: (change: LogChange, queryClient: QueryClient) => void
  syncWithBackend: () => Promise<void>
  clearError: () => void
}

const isNewLog = (logId?: number | null) => logId == null || logId <= 0

const getChangeKey = (change: LogChange) =>
  isNewLog(change.logId) ? `task_${change.taskId}_${change.date}` : `log_${change.logId}`

function extractErrorMessage(err: any): string {
  const data = err?.response?.data
  if (typeof data === "string" && data) return data
  if (data?.detail) return String(data.detail)
  if (Array.isArray(data?.date) && data.date[0]) return String(data.date[0])
  if (Array.isArray(data?.non_field_errors) && data.non_field_errors[0]) {
    return String(data.non_field_errors[0])
  }
  if (typeof data?.error === "string") return data.error
  return "Не удалось сохранить отметку"
}

export const useLogSyncStore = create<LogSyncState>((set, get) => ({
  buffer: {},
  isSyncing: false,
  timerId: null,
  queryClient: null,
  lastError: null,

  queueChange: (change, queryClient) => {
    const key = getChangeKey(change)

    set((state) => ({
      buffer: { ...state.buffer, [key]: change },
      queryClient,
      lastError: null,
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
    const failedPermanently = new Set<string>()
    let lastErrorMessage: string | null = null
    let hasRetryableError = false

    for (const [key, item] of entries) {
      try {
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
      } catch (err: any) {
        const status: number | undefined = err?.response?.status

        // 4xx — валидационная/логическая ошибка. Ретраить бессмысленно:
        // данные не пройдут, пока пользователь не исправит. Убираем из буфера,
        // чтобы кэш инвалидировался и оптимистичный статус откатился.
        if (status && status >= 400 && status < 500) {
          failedPermanently.add(key)
          lastErrorMessage = extractErrorMessage(err)
          console.warn("[sync] permanently failed:", key, lastErrorMessage)
        } else {
          // 5xx / сеть / таймаут — оставим в буфере, повторим позже.
          hasRetryableError = true
          console.error("[sync] retryable error:", key, err)
        }
      }
    }

    const pendingTimer = get().timerId
    if (pendingTimer) clearTimeout(pendingTimer)

    set((state) => {
      const nextBuffer = { ...state.buffer }
      for (const key of succeeded) {
        if (nextBuffer[key] === snapshot[key]) delete nextBuffer[key]
      }
      for (const key of failedPermanently) {
        delete nextBuffer[key]
      }
      return {
        buffer: nextBuffer,
        isSyncing: false,
        timerId: null,
        lastError: lastErrorMessage ?? state.lastError,
      }
    })

    const queryClient = get().queryClient
    if ((succeeded.size > 0 || failedPermanently.size > 0) && queryClient) {
      // Инвалидация откатывает оптимистичные апдейты, в том числе неудачные.
      await queryClient.invalidateQueries({
        predicate: (q) => {
          const head = q.queryKey[0]
          return head === "weekly-review" || head === "child-weekly-review"
        },
      })
    }

    if (hasRetryableError && Object.keys(get().buffer).length > 0) {
      const timer = setTimeout(() => {
        void get().syncWithBackend()
      }, 2000)
      set({ timerId: timer })
    }
  },

  clearError: () => set({ lastError: null }),
}))
