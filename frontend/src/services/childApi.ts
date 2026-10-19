import { api } from "@/lib/axios"

export const childApi = {
  // Список активных задач текущего ребенка
  async getMyTasks() {
    const res = await api.get("/api/tasks/")
    return res.data
  },

  // История выполнения заданий (логи)
  async getMyTaskLogs() {
    const res = await api.get("/api/task-logs/")
    return res.data
  },

  // Отправить задание на проверку (создать TaskLog со статусом DONE_BY_CHILD)
  async submitTaskExecution(taskId: number, date: string) {
    const res = await api.post("/api/task-logs/", {
      task: taskId,
      date: date,
      status: "DONE",
    })
    return res.data
  },

  // Недельные отчеты ребенка
  async getMyReports() {
    const res = await api.get("/api/weekly-reports/")
    return res.data
  },
}
