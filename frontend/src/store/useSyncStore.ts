import { create } from "zustand"
import { api } from "@/lib/axios"
import { parentApi } from "@/services/parentApi"

interface SyncState {
  // 1 & 2. Структура хранилища и буфер изменений
  buffer: Record<string, any>
  isSyncing: boolean
  timerId: NodeJS.Timeout | null

  // Методы модификации
  updateData: (payload: Record<string, any>) => void
  syncWithBackend: () => Promise<void>
}

export const useSyncStore = create<SyncState>((set, get) => ({
  buffer: {},
  isSyncing: false,
  timerId: null,

  updateData: (payload) => {
    // 4. Мгновенное обновление состояния (optimistic update)
    set((state) => ({
      buffer: { ...state.buffer, ...payload },
    }))

    // Очищаем предыдущий таймер дебаунса
    const currentTimer = get().timerId
    if (currentTimer) {
      clearTimeout(currentTimer)
    }

    // 4. Запуск нового таймера на 1 секунду (дебаунс)
    const newTimer = setTimeout(async () => {
      await get().syncWithBackend()
    }, 1000)

    set({ timerId: newTimer })
  },

  syncWithBackend: async () => {
    const { buffer } = get()
    if (Object.keys(buffer).length === 0) return

    set({ isSyncing: true })

    try {
      const changes = Object.values(buffer)

      // Выполняем запросы строго последовательно, чтобы не блокировать SQLite
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
    } catch (error) {
      console.error("Ошибка синхронизации логов:", error)
      set({ isSyncing: false })
    }
  },
}))
