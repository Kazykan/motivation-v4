import { Card, CardContent } from "@/components/ui/card"
import { Users } from "lucide-react"

interface ChildCardProps {
  child: {
    id: number
    name: string
    age?: number
    balance: number
    weekly_gain?: number
  }
  action?: React.ReactNode
}

export function ChildCard({ child, action }: ChildCardProps) {
  return (
    <Card className="border-slate-200">
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
            <Users className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-900">
              {child.name} • {child.age || 10} лет
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
