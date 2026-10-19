"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

interface TaskFormSheetProps {
  isOpen: boolean
  onClose: () => void
  taskToEdit?: {
    id: number
    title: string
    description: string
    price_per_run: number
    child_id?: number
    schedule_type?: string
    days?: string[]
    count?: number
    is_active?: boolean
  } | null
  childrenList: Array<{ id: number; name: string }>
  onSubmit: (data: any) => Promise<void>
}

const DAYS_OF_WEEK = [
  { id: "mon", label: "Пн" },
  { id: "tue", label: "Вт" },
  { id: "wed", label: "Ср" },
  { id: "thu", label: "Чт" },
  { id: "fri", label: "Пт" },
  { id: "sat", label: "Сб" },
  { id: "sun", label: "Вс" },
]

export function TaskFormSheet({
  isOpen,
  onClose,
  taskToEdit,
  childrenList,
  onSubmit,
}: TaskFormSheetProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [childId, setChildId] = useState<string>("")
  const [scheduleType, setScheduleType] = useState<"FIXED" | "FLEXIBLE">("FIXED")
  const [selectedDays, setSelectedDays] = useState<string[]>(["mon", "tue", "wed", "thu", "fri"])
  const [count, setCount] = useState<number>(5)
  const [isActive, setIsActive] = useState<boolean>(true)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title)
      setDescription(taskToEdit.description)
      setPrice(String(taskToEdit.price_per_run))
      setChildId(taskToEdit.child_id ? String(taskToEdit.child_id) : "")
      setScheduleType(taskToEdit.schedule_type === "Гибкое" ? "FLEXIBLE" : "FIXED")
      setSelectedDays(taskToEdit.days || ["mon", "tue", "wed", "thu", "fri"])
      setCount(taskToEdit.count || 5)
      setIsActive(taskToEdit.is_active ?? true)
    } else {
      setTitle("")
      setDescription("")
      setPrice("")
      setChildId(childrenList[0]?.id ? String(childrenList[0].id) : "")
      setScheduleType("FIXED")
      setSelectedDays(["mon", "tue", "wed", "thu", "fri"])
      setCount(5)
      setIsActive(true)
    }
  }, [taskToEdit, isOpen, childrenList])

  const toggleDay = (dayId: string) => {
    setSelectedDays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId],
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSubmit({
        id: taskToEdit?.id,
        title,
        description,
        price_per_run: Number(price),
        child: Number(childId),
        schedule_type: scheduleType === "FIXED" ? "Фиксированное" : "Гибкое",
        days: scheduleType === "FIXED" ? selectedDays : [],
        count: scheduleType === "FLEXIBLE" ? count : selectedDays.length,
        is_active: isActive,
      })
      onClose()
    } catch (error) {
      console.error("Ошибка сохранения задачи:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="fixed bottom-0 top-auto left-1/2 -translate-x-1/2 translate-y-0 w-full max-w-md rounded-t-3xl rounded-b-none p-5 sm:max-w-md bg-[#f7f6f2] border-none shadow-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-left pb-1">
          <DialogTitle className="text-base font-bold text-slate-900">
            {taskToEdit ? "Редактировать задание" : "Создать задание"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-600">Название задачи</label>
            <Input
              placeholder="Например, Уборка комнаты"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="bg-white border-none shadow-none h-11 rounded-xl text-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-600">Описание</label>
            <Input
              placeholder="Подробное описание..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="bg-white border-none shadow-none h-11 rounded-xl text-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-600">Сумма за выполнение (₽)</label>
            <Input
              type="number"
              placeholder="300"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              className="bg-white border-none shadow-none h-11 rounded-xl text-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-600">Тип расписания</label>
            <div className="flex rounded-xl bg-slate-200/70 p-1">
              <button
                type="button"
                className={cn(
                  "flex-1 rounded-lg py-2 text-xs font-semibold transition-all",
                  scheduleType === "FIXED" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600",
                )}
                onClick={() => setScheduleType("FIXED")}
              >
                Фиксированное
              </button>
              <button
                type="button"
                className={cn(
                  "flex-1 rounded-lg py-2 text-xs font-semibold transition-all",
                  scheduleType === "FLEXIBLE"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600",
                )}
                onClick={() => setScheduleType("FLEXIBLE")}
              >
                Гибкое
              </button>
            </div>
          </div>

          {scheduleType === "FIXED" ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-600">Дни недели</label>
              <div className="flex justify-between gap-1">
                {DAYS_OF_WEEK.map((day) => {
                  const isSelected = selectedDays.includes(day.id)
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => toggleDay(day.id)}
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold transition-all",
                        isSelected
                          ? "bg-amber-400 text-slate-900 shadow-sm"
                          : "bg-white text-slate-400 hover:bg-slate-100",
                      )}
                    >
                      {day.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-600">Количество выполнений</label>
              <div className="flex items-center bg-white rounded-xl px-3 h-11 shadow-none">
                <button
                  type="button"
                  className="h-8 px-2 text-slate-400 hover:text-slate-900 disabled:opacity-20 text-lg font-medium"
                  onClick={() => setCount((prev) => Math.max(1, prev - 1))}
                  disabled={count <= 1}
                >
                  –
                </button>
                <div className="flex-1 text-center text-sm font-semibold text-slate-900">
                  {count}
                </div>
                <button
                  type="button"
                  className="h-8 px-2 text-slate-400 hover:text-slate-900 disabled:opacity-20 text-lg font-medium"
                  onClick={() => setCount((prev) => Math.min(7, prev + 1))}
                  disabled={count >= 7}
                >
                  +
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-1 px-1">
            <label className="text-xs font-medium text-slate-600">Активно</label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-400 text-slate-900 hover:bg-amber-500 font-semibold h-12 rounded-xl text-base shadow-sm"
            >
              {loading ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
