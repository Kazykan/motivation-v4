import { api } from "@/lib/axios"

export const parentApi = {
  // Дети и общая информация
  async getChildren() {
    const res = await api.get("/api/users/", { params: { is_child: true } })
    return res.data
  },

  // Задачи (CRUD для родителей)
  async getTasks(childId?: number) {
    const res = await api.get(
      "/api/tasks/",
      childId ? { params: { child_id: childId } } : undefined,
    )
    return res.data
  },

  async createTask(data: {
    title: string
    description: string
    price_per_run: number
    child: number
    [key: string]: any
  }) {
    const res = await api.post("/api/tasks/", data)
    return res.data
  },

  async updateTask(id: number, data: any) {
    const res = await api.put(`/api/tasks/${id}/`, data)
    return res.data
  },

  async deleteTask(id: number) {
    await api.delete(`/api/tasks/${id}/`)
  },

  // Проверка и подтверждение логов заданий
  async getTaskLogs(childId?: number, date?: string) {
    const params: any = {}
    if (childId) params.child_id = childId
    if (date) params.date = date
    const res = await api.get("/api/task-logs/", { params })
    return res.data
  },

  // Массовое подтверждение (bulk-approve из твоего Django ViewSet)
  async bulkApproveLogs(logIds: number[]) {
    const res = await api.post("/api/task-logs/bulk-approve/", { log_ids: logIds })
    return res.data
  },

  // Отчеты
  async getWeeklyReports(childId?: number) {
    const res = await api.get(
      "/api/weekly-reports/",
      childId ? { params: { child_id: childId } } : undefined,
    )
    return res.data
  },
}
