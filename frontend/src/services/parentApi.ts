import { api } from "@/lib/axios"
import { LogStatusValue } from "@/types/props"

export const parentApi = {
  // Все запросы — строго на BFF-роуты Next.js (/api/...).
  // Заголовки авторизации (X-Parent-Telegram-Id и т.п.) подставляются
  // на стороне Route Handlers, см. AI.md / BFF Pattern.

  async getChildren() {
    const res = await api.get("/api/children")
    return res.data
  },

  async getTasks(childId?: number) {
    const res = await api.get("/api/tasks", childId ? { params: { child_id: childId } } : undefined)
    return res.data
  },

  async createTask(data: {
    title: string
    description: string
    weekly_price: number
    child: number
    schedule_type: "FLEXIBLE" | "FIXED"
    target_count?: number | null
    target_days?: number[]
    is_active?: boolean
  }) {
    const res = await api.post("/api/tasks", data)
    return res.data
  },

  async updateTask(id: number, data: any) {
    const res = await api.put(`/api/tasks/${id}`, data)
    return res.data
  },

  async deleteTask(id: number) {
    await api.delete(`/api/tasks/${id}`)
  },

  async getTaskLogs(childId?: number, date?: string) {
    const params: Record<string, any> = {}
    if (childId) params.child_id = childId
    if (date) params.date = date
    const res = await api.get("/api/task-logs", { params })
    return res.data
  },

  async createTaskLog(data: { task: number; date: string; status: LogStatusValue  }) {
    const res = await api.post("/api/task-logs", data)
    return res.data
  },

  async bulkApproveLogs(logIds: number[]) {
    const res = await api.post("/api/task-logs/bulk-approve", {
      log_ids: logIds,
    })
    return res.data
  },

  async updateTaskLogStatus(logId: number, status: LogStatusValue) {
    const res = await api.patch(`/api/task-logs/${logId}`, { status })
    return res.data
  },

  async getWeeklyReports(childId?: number, weekStart?: string) {
    const params: Record<string, any> = {}
    if (childId) params.child_id = childId
    if (weekStart) params.week_start = weekStart
    const res = await api.get("/api/parent/reports", { params })
    return res.data
  },

  async closeWeeklyReport(
    reportId: number,
    data: { is_payout_confirmed: boolean; manual_adjustment?: number; comment?: string },
  ) {
    const res = await api.patch(`/api/parent/reports/${reportId}/close`, data)
    return res.data
  },

  async getWeeklyReview(childId: number, weekStart?: string) {
    const params: Record<string, any> = { child_id: childId }
    if (weekStart) params.week_start = weekStart
    const res = await api.get("/api/tasks/weekly-review", { params })
    return res.data
  },

  async getTaskLogHistory(logId: number) {
    const res = await api.get(`/api/task-logs/${logId}/history`)
    return res.data
  },
  async closeWeek(payload: {
    child_id: number
    week_start: string
    is_payout_confirmed: boolean
    manual_adjustment?: number
    comment?: string
  }) {
    const res = await api.post("/api/tasks/close-week", payload)
    return res.data
  },
  async getCurrentInvite() {
    const res = await api.get("/api/invites")
    return res.data as {
      id: number
      code: string
      expires_at: string
      is_used: boolean
    }
  },

  async createInvite() {
    const res = await api.post("/api/invites")
    return res.data as {
      id: number
      code: string
      expires_at: string
      is_used: boolean
    }
  },
}
