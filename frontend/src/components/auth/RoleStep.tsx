"use client"

import { Button } from "@/components/ui/button"
import { Users, Baby } from "lucide-react"
import { RoleStepProps } from "@/types/props"

export function RoleStep({ onSelectParent, onSelectChild }: RoleStepProps) {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-8 px-6">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-xl font-bold text-slate-900">Кто вы?</h1>
        <p className="text-sm text-slate-500">Это поможет настроить приложение под вас</p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <button
          type="button"
          onClick={onSelectParent}
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-amber-300 hover:bg-amber-50/50"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <Users className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-900">Я родитель</span>
            <span className="text-xs text-slate-500">Создам семью или присоединюсь по коду</span>
          </div>
        </button>

        <button
          type="button"
          onClick={onSelectChild}
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-amber-300 hover:bg-amber-50/50"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <Baby className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-900">Я ребёнок</span>
            <span className="text-xs text-slate-500">Введу код от родителя</span>
          </div>
        </button>
      </div>
    </div>
  )
}
