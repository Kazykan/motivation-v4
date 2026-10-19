import { create } from "zustand"
import { api } from "@/lib/axios"

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

    // 5. Перевод флага синхронизации в true (активация индикатора)
    set({ isSyncing: true })

    try {
      // 5. Фоновая отправка накопленного буфера через Axios
      await api.post("/api/sync-endpoint/", buffer)

      // 5. При успешном ответе очистка буфера
      set({ buffer: {}, isSyncing: false, timerId: null })
    } catch (error) {
      console.error("Ошибка синхронизации:", error)
      set({ isSyncing: false })
    }
  },
}))
