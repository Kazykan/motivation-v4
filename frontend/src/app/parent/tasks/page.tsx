"use client"

import { useState, useEffect } from "react"
import { useTasks } from "@/hooks/useTasks"
import { useChildren } from "@/hooks/useChildren"
import { Button } from "@/components/ui/button"
import { CheckSquare, Plus } from "lucide-react"
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
        <h1 className="text-xl font-bold tracking-tight text-text-main">Управление заданиями</h1>
        <Button
          size="sm"
          onClick={handleCreateNew}
          disabled={children.length === 0}
          className="cursor-pointer bg-brand-primary font-semibold text-brand-dark hover:bg-brand-primary-hover"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Создать
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedChildId("ALL")}
          className={cn(
            "cursor-pointer whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all",
            selectedChildId === "ALL"
              ? "bg-brand-primary text-brand-dark shadow-xs"
              : "border border-app-surface bg-app-card text-text-muted hover:bg-app-surface",
          )}
        >
          Все дети ({tasks.length})
        </button>
        {children.map((child: any) => {
          const childIdStr = String(child.id)
          const childTasksCount = tasks.filter(
            (t: any) => String(t.child) === childIdStr || String(t.child_id) === childIdStr,
          ).length

          return (
            <button
              key={child.id}
              onClick={() => setSelectedChildId(childIdStr)}
              className={cn(
                "cursor-pointer whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all",
                selectedChildId === childIdStr
                  ? "bg-brand-primary text-brand-dark shadow-xs"
                  : "border border-app-surface bg-app-card text-text-muted hover:bg-app-surface",
              )}
            >
              {child.first_name || child.name || "Ребенок"} ({childTasksCount})
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-text-muted">Загрузка заданий...</div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-app-surface text-text-muted">
            <CheckSquare className="h-8 w-8" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-text-main">Заданий пока нет</p>
            <p className="max-w-[16rem] text-xs text-text-muted">
              {children.length === 0
                ? "Сначала добавьте ребёнка в разделе «Дети»"
                : "Создайте первое задание — ребёнок увидит его на этой неделе"}
            </p>
          </div>
          <Button
            size="lg"
            onClick={handleCreateNew}
            disabled={children.length === 0}
            className="h-12 w-full max-w-xs bg-brand-action text-base font-semibold text-brand-action-text hover:bg-brand-action-hover disabled:opacity-50"
          >
            <Plus className="mr-2 h-5 w-5" />
            Создать задание
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {tasks.map((task: any) => {
            const currentChild = children.find(
              (c: any) => String(c.id) === String(task.child || task.child_id),
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
