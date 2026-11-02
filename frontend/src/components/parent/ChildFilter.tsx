"use client"

import { cn } from "@/lib/utils"

interface ChildFilterProps {
  children: Array<{ id: number; first_name?: string; name?: string }>
  selectedChildId: string
  onChange: (id: string) => void
}

export function ChildFilter({ children, selectedChildId, onChange }: ChildFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      <button
        type="button"
        onClick={() => onChange("ALL")}
        className={cn(
          "cursor-pointer whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all",
          selectedChildId === "ALL"
            ? "bg-slate-900 text-white shadow-xs"
            : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
        )}
      >
        Все дети
      </button>

      {children.map((child) => (
        <button
          key={child.id}
          type="button"
          onClick={() => onChange(String(child.id))}
          className={cn(
            "cursor-pointer whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all",
            selectedChildId === String(child.id)
              ? "bg-slate-900 text-white shadow-xs"
              : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
          )}
        >
          {child.first_name || child.name || "Ребенок"}
        </button>
      ))}
    </div>
  )
}
