// src/app/child/profile/_components/ProfileCard.tsx
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User, ShieldCheck, PhoneCall } from "lucide-react"

interface ProfileCardProps {
  user: {
    name?: string
    role?: string
    phone?: string
    telegram?: string
  }
}

export function ProfileCard({ user }: ProfileCardProps) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <User className="h-8 w-8" />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900">{user.name || "Ребенок"}</h2>
              <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                Ребенок
              </Badge>
            </div>
            <span className="text-xs text-slate-500">
              {user.telegram ? `@${user.telegram}` : "Telegram аккаунт привязан"}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Статус авторизации: Активен (Telegram initData)</span>
          </div>
          <div className="flex items-center gap-2">
            <PhoneCall className="h-4 w-4 text-slate-400" />
            <span>Телефон: {user.phone || "Не указан"}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
