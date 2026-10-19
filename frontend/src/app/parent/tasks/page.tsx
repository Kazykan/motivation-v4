"use client"

import { useEffect, useState } from "react"
import { parentApi } from "@/services/parentApi"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit2, Trash2 } from "lucide-react"
import { TaskFormSheet } from "@/components/TaskFormSheet"

export default function ParentTasksPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [children, setChildren] = useState<any[]>([])
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<any | null>(null)

  const loadData = async () => {
    try {
      const [tasksData, childrenData] = await Promise.all([
        parentApi.getTasks(),
        parentApi.getChildren(),
      ])
      setTasks(tasksData)
      setChildren(childrenData)
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreateNew = () => {
    setSelectedTask(null)
    setIsSheetOpen(true)
  }

  const handleEdit = (task: any) => {
    setSelectedTask(task)
    setIsSheetOpen(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await parentApi.deleteTask(id)
      loadData()
    } catch (error) {
      console.error("Ошибка удаления:", error)
    }
  }

  const handleSubmitForm = async (formData: any) => {
    if (formData.id) {
      await parentApi.updateTask(formData.id, formData)
    } else {
      await parentApi.createTask(formData)
    }
    loadData()
  }

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Управление заданиями</h1>
        <Button
          size="sm"
          onClick={handleCreateNew}
          className="bg-amber-400 text-slate-900 hover:bg-amber-500"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Создать
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {tasks.map((task) => (
          <Card key={task.id} className="border-slate-200">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-sm font-semibold text-slate-900">{task.title}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                    {task.price_per_run} ₽
                  </Badge>
                  <Button variant="ghost" size="icon-xs" onClick={() => handleEdit(task)}>
                    <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                  </Button>
                  <Button variant="ghost" size="icon-xs" onClick={() => handleDelete(task.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-slate-600">{task.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <TaskFormSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        taskToEdit={selectedTask}
        childrenList={children}
        onSubmit={handleSubmitForm}
      />
    </div>
  )
}
