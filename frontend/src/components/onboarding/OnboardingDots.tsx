"use client"

import { cn } from "@/lib/utils"
import { OnboardingDotsProps } from "@/types/props"

export function OnboardingDots({ total, active }: OnboardingDotsProps) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-all",
            i === active ? "w-6 bg-brand-action" : "w-1.5 bg-text-muted/30",
          )}
        />
      ))}
    </div>
  )
}
