import { Card, CardContent } from "@/components/ui/card"
import { ChildCardProps } from "@/types/props"
import { Users } from "lucide-react"

export function ChildCard({ child, action }: ChildCardProps) {
  const calculateAge = () => {
    if (child.age) return child.age
    if (!child.birth_date) return null
    const today = new Date()
    const birth = new Date(child.birth_date)
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  const getGenderLabel = () => {
    if (child.gender === "MALE") return "Сын"
    if (child.gender === "FEMALE") return "Дочь"
    return null
  }

  const age = calculateAge()
  const genderLabel = getGenderLabel()

  return (
    <Card className="rounded-2xl border-brand-muted/15 bg-white shadow-xs transition-all hover:shadow-md">
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-primary-soft text-brand-warning-strong shadow-xs">
            <Users className="h-6 w-6" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-bold text-brand-dark">
              {child.first_name || child.name || child.username}
              {genderLabel && ` • ${genderLabel}`}
              {age !== null && ` • ${age} лет`}
            </span>
            <div className="flex items-center gap-3 text-xs text-brand-muted">
              <span>
                Баланс:{" "}
                <strong className="font-semibold text-brand-dark">{child.balance || 0} ₽</strong>
              </span>
              {child.weekly_gain !== undefined && (
                <span className="font-medium text-brand-success">
                  +{child.weekly_gain} ₽ за неделю
                </span>
              )}
            </div>
          </div>
        </div>
        {action}
      </CardContent>
    </Card>
  )
}
