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
            ? "bg-brand-dark text-white shadow-xs"
            : "border border-brand-muted/20 bg-white text-brand-muted hover:bg-brand-surface-alt",
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
              ? "bg-brand-dark text-white shadow-xs"
              : "border border-brand-muted/20 bg-white text-brand-muted hover:bg-brand-surface-alt",
          )}
        >
          {child.first_name || child.name || "Ребенок"}
        </button>
      ))}
    </div>
  )
}
