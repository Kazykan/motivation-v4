export function getMonday(d: Date): Date {
  const date = new Date(d)
  date.setHours(0, 0, 0, 0)
  const day = date.getDay() === 0 ? 7 : date.getDay()
  date.setDate(date.getDate() - (day - 1))
  return date
}

export function addWeeks(d: Date, delta: number): Date {
  const date = new Date(d)
  date.setDate(date.getDate() + delta * 7)
  return date
}

export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function getWeekEnd(monday: Date): Date {
  const d = new Date(monday)
  d.setDate(d.getDate() + 6)
  return d
}

export function isWeekCloseable(monday: Date): boolean {
  const end = getWeekEnd(monday)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today >= end
}
