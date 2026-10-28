import { api } from "@/lib/axios"

export const childApi = {
  async getMyTasks() {
    // BFF: /api/tasks без child_id вернёт задачи текущего ребёнка (если
    // бэкенд умеет фильтровать по X-Child-Telegram-Id — надо добавить
    // поддержку в route.ts, сейчас route.ts это не делает).
    const res = await api.get("/api/tasks")
    return res.data
  },

  async getMyTaskLogs() {
    const res = await api.get("/api/task-logs")
    return res.data
  },

  async submitTaskExecution(taskId: number, date: string) {
    const res = await api.post("/api/task-logs", {
      task: taskId,
      date,
      status: "DONE",
    })
    return res.data
  },

  async getMyReports() {
    const res = await api.get("/api/parent/reports") // ❌ нужен child-роут
    return res.data
  },
}
