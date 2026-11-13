"use client"

import { Users, Baby } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RoleStepProps } from "@/types/props"

export function RoleStep({ onSelectParent, onSelectChild }: RoleStepProps) {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-8 px-6">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-xl font-bold text-brand-dark">Кто вы?</h1>
        <p className="text-sm text-brand-muted">Это поможет настроить приложение под вас</p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-2">
        <Button
          variant="outline"
          className="h-11 w-full justify-center gap-2"
          onClick={onSelectParent}
        >
          <Users className="h-4 w-4" />
          <span>Я родитель</span>
        </Button>

        <Button
          variant="outline"
          className="h-11 w-full justify-center gap-2"
          onClick={onSelectChild}
        >
          <Baby className="h-4 w-4" />
          <span>Я ребёнок</span>
        </Button>
      </div>
    </div>
  )
}
