export const WEEK_DAYS_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]

export const WEEK_DAYS_MAP: Record<number, string> = {
  1: "Пн",
  2: "Вт",
  3: "Ср",
  4: "Чт",
  5: "Пт",
  6: "Сб",
  7: "Вс",
}

export function formatDateISO(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function getWeekDates(weekStartIso: string): Date[] {
  const start = new Date(`${weekStartIso}T12:00:00`)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return d
  })
}

export function formatLongDay(dateIso: string): string {
  return new Date(`${dateIso}T12:00:00`).toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
}

export function formatShortDay(dateIso: string): string {
  return new Date(`${dateIso}T12:00:00`).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  })
}

export function formatWeekday(dateIso: string): string {
  return new Date(`${dateIso}T12:00:00`).toLocaleDateString("ru-RU", {
    weekday: "long",
  })
}
