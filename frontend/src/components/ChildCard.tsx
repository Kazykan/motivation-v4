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
    <Card className="border-slate-200">
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
            <Users className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-900">
              {child.first_name || child.name || child.username}
              {genderLabel && ` • ${genderLabel}`}
              {age !== null && ` • ${age} лет`}
            </span>
            <div className="flex items-center gap-3 text-xs text-slate-500 pt-0.5">
              <span>
                Баланс: <strong className="text-slate-900">{child.balance || 0} ₽</strong>
              </span>
              {child.weekly_gain !== undefined && (
                <span className="text-emerald-600 font-medium">
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
