import React from "react"

export interface ChildCardProps {
  child: {
    id: number
    name?: string
    first_name?: string
    username?: string
    age?: number
    birth_date?: string
    gender?: "MALE" | "FEMALE" | string
    balance: number
    weekly_gain?: number
  }
  action?: React.ReactNode
}

export interface ProfileCardProps {
  user: {
    name?: string
    role?: string
    phone?: string
    telegram?: string
  }
}

export interface TaskCardProps {
  task: {
    id: number
    title: string
    description: string
    price_per_run: number
    schedule_type?: string
  }
  isSubmitting: boolean
  onComplete: (taskId: number) => void
}

export interface TaskFormSheetProps {
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

export interface TaskLogCardProps {
  log: {
    id: number
    task_title?: string
    date: string
    earned?: number
  }
}

export interface TaskCardForParentProps {
  task: {
    id: number
    title: string
    description: string
    weekly_price: number | string
    schedule_type: "FLEXIBLE" | "FIXED"
    target_count?: number
    target_days?: number[] | string[]
    child_name?: string
    price_per_run?: number
  }
  onEdit: (task: any) => void
  onDelete: (id: number) => void
}

export interface WeeklyReviewTaskLog {
  id: number
  date: string
  status: "APPROVED" | "DONE" | "REJECTED" | "PENDING"
  earned_amount: string | number
}

export interface WeeklyReviewChild {
  id: number
  name: string
  age: number
  avatar?: string
}

export interface WeeklyReviewSummary {
  approvedCount: number
  pendingCount: number
  rejectedCount: number
  calculatedAmount: string | number
}

export interface WeeklyReviewItem {
  taskId: number
  title: string
  description: string
  weeklyPrice: string | number
  scheduleType: "FIXED" | "FLEXIBLE"
  targetCount: number
  targetDays?: number[] | string[]
  weekStart: string
  weekEnd: string
  child: WeeklyReviewChild
  summary: WeeklyReviewSummary
  logs: WeeklyReviewTaskLog[]
}

export interface LogHistoryViewerProps {
  logId: number
}

export interface TaskLogHistoryItem {
  id: number
  old_status: string
  new_status: string
  changed_by_name: string
  changed_at: string
}
