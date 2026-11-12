import { api } from "@/lib/axios"
import { LogStatusValue } from "@/types/props"

export const childApi = {
  async getMyTasks() {
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

  async getMyWeeklyReport() {
    const res = await api.get("/api/tasks/my-weekly-report")
    return res.data
  },

  async getMyReports() {
    const res = await api.get("/api/child/reports")
    return res.data
  },

  async createTaskLog(data: { task: number; date: string; status: LogStatusValue }) {
    const res = await api.post("/api/task-logs", data)
    return res.data
  },

  async updateTaskLogStatus(logId: number, status: LogStatusValue) {
    const res = await api.patch(`/api/task-logs/${logId}`, { status })
    return res.data
  },

  async getTaskLogHistory(logId: number) {
    const res = await api.get(`/api/task-logs/${logId}/history`)
    return res.data
  },
  async getWeeklyReview(weekStart?: string) {
    const params: Record<string, any> = {}
    if (weekStart) params.week_start = weekStart
    const res = await api.get("/api/child/weekly-review", { params })
    return res.data
  },
}
