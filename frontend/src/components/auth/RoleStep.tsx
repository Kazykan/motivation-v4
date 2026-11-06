"use client"

import { Users, Baby } from "lucide-react"
import { RoleStepProps } from "@/types/props"

export function RoleStep({ onSelectParent, onSelectChild }: RoleStepProps) {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-8 px-6">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-xl font-bold text-brand-dark">Кто вы?</h1>
        <p className="text-sm text-brand-muted">Это поможет настроить приложение под вас</p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <button
          type="button"
          onClick={onSelectParent}
          className="flex items-center gap-3 rounded-2xl border border-brand-muted/20 bg-white p-4 text-left transition-all hover:border-brand-primary hover:bg-brand-primary-soft/50"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-primary-soft text-brand-warning-strong">
            <Users className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-brand-dark">Я родитель</span>
            <span className="text-xs text-brand-muted">Создам семью или присоединюсь по коду</span>
          </div>
        </button>

        <button
          type="button"
          onClick={onSelectChild}
          className="flex items-center gap-3 rounded-2xl border border-brand-muted/20 bg-white p-4 text-left transition-all hover:border-brand-primary hover:bg-brand-primary-soft/50"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-success-soft text-brand-success-strong">
            <Baby className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-brand-dark">Я ребёнок</span>
            <span className="text-xs text-brand-muted">Введу код от родителя</span>
          </div>
        </button>
      </div>
    </div>
  )
}
