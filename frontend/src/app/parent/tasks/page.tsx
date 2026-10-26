// src/app/parent/tasks/page.tsx
"use client"

import { useState, useEffect } from "react"
import { useTasks } from "@/hooks/useTasks"
import { useChildren } from "@/hooks/useChildren"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { TaskCardForParent } from "@/components/TaskCardForParent"
import { TaskFormSheet } from "@/components/TaskFormSheet"
import { cn } from "@/lib/utils"

export default function ParentTasksPage() {
  const [mounted, setMounted] = useState(false)
  const [selectedChildId, setSelectedChildId] = useState<string>("ALL")
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<any | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const parsedChildId = selectedChildId === "ALL" ? undefined : Number(selectedChildId)

  const {
    tasks,
    isLoading: tasksLoading,
    createTask,
    updateTask,
    deleteTask,
  } = useTasks(parsedChildId)
  const { children, isLoading: childrenLoading } = useChildren()

  if (!mounted) {
    return null
  }

  const loading = tasksLoading || childrenLoading

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
      deleteTask(id)
    } catch (error) {
      console.error("Ошибка удаления задания:", error)
    }
  }

  const handleSubmitForm = async (formData: any) => {
    if (formData.id) {
      updateTask({ id: formData.id, data: formData })
    } else {
      createTask(formData)
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-16">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-brand-dark">Управление заданиями</h1>
        <Button
          size="sm"
          onClick={handleCreateNew}
          className="bg-brand-primary text-brand-dark hover:bg-brand-primary-hover font-semibold cursor-pointer"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Создать
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedChildId("ALL")}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
            selectedChildId === "ALL"
              ? "bg-brand-dark text-white shadow-xs"
              : "bg-white text-brand-muted border border-slate-200 hover:bg-slate-50",
          )}
        >
          Все дети ({tasks.length})
        </button>
        {children.map((child: any) => {
          const childIdStr = String(child.id)
          const childTasksCount = tasks.filter(
            (t) => String(t.child) === childIdStr || String(t.child_id) === childIdStr,
          ).length

          return (
            <button
              key={child.id}
              onClick={() => setSelectedChildId(childIdStr)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
                selectedChildId === childIdStr
                  ? "bg-brand-dark text-white shadow-xs"
                  : "bg-white text-brand-muted border border-slate-200 hover:bg-slate-50",
              )}
            >
              {child.first_name || child.name || "Ребенок"} ({childTasksCount})
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-brand-muted">Загрузка заданий...</div>
      ) : tasks.length === 0 ? (
        <div className="py-12 text-center text-sm text-brand-muted">
          Нет заданий для отображения
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {tasks.map((task) => {
            const currentChild = children.find(
              (c) => String(c.id) === String(task.child || task.child_id),
            )
            const taskWithChildName = {
              ...task,
              child_name: currentChild?.first_name || currentChild?.name,
            }

            return (
              <TaskCardForParent
                key={task.id}
                task={taskWithChildName}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            )
          })}
        </div>
      )}

      <TaskFormSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        taskToEdit={
          selectedTask
            ? {
                ...selectedTask,
                child_id:
                  selectedTask.child ||
                  selectedTask.child_id ||
                  (selectedChildId !== "ALL" ? Number(selectedChildId) : undefined),
              }
            : selectedChildId !== "ALL"
              ? ({ child_id: Number(selectedChildId) } as any)
              : null
        }
        childrenList={children}
        onSubmit={handleSubmitForm}
      />
    </div>
  )
}
