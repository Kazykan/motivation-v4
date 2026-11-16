import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
    <Card className="rounded-card border-app-surface bg-app-card py-0 shadow-xs">
      <CardContent className="flex items-center justify-between gap-3 p-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="h-11 w-11 shrink-0">
            <AvatarImage src={child.avatar_url ?? undefined} />
            <AvatarFallback className="bg-brand-primary-soft text-sm font-semibold text-brand-warning-strong">
              {(fullName || "?").slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-sm font-bold text-text-main">{fullName}</span>
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              {age !== null && <span>{age} лет</span>}
              {age !== null && genderLabel && <span>•</span>}
              {genderLabel && <span>{genderLabel}</span>}
              {age === null && !genderLabel && <span>Профиль не заполнен</span>}
            </div>
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </CardContent>
    </Card>
  )
}
