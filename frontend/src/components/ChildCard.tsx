import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ChildCardProps } from "@/types/props"

function calcAge(birthDate?: string | null): number | null {
  if (!birthDate) return null
  const b = new Date(birthDate)
  if (isNaN(b.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--
  return age
}

export function ChildCard({ child, action }: ChildCardProps) {
  const age = calcAge(child.birth_date)
  const genderLabel = child.gender === "MALE" ? "Сын" : child.gender === "FEMALE" ? "Дочь" : null
  const fullName =
    [child.first_name, child.last_name].filter(Boolean).join(" ") || child.name || "Ребёнок"

  return (
    <Card className="rounded-2xl border-app-surface bg-app-card shadow-xs transition-all hover:shadow-md">
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3.5">
          <Avatar className="h-12 w-12">
            <AvatarImage src={child.avatar_url ?? undefined} />
            <AvatarFallback className="bg-brand-action/15 text-brand-action-hover text-sm">
              {(fullName || "?").slice(0, 1)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-bold text-text-main">{fullName}</span>
            <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
              {age !== null && <span>{age} лет</span>}
              {age !== null && genderLabel && <span>•</span>}
              {genderLabel && <span>{genderLabel}</span>}
            </div>
          </div>
        </div>
        {action}
      </CardContent>
    </Card>
  )
}
