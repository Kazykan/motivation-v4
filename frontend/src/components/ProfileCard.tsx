import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User, ShieldCheck, PhoneCall } from "lucide-react"
import { ProfileCardProps } from "@/types/props"

export function ProfileCard({ user }: ProfileCardProps) {
  return (
    <Card className="border-brand-muted/20 shadow-sm">
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-primary-soft text-brand-warning-strong">
            <User className="h-8 w-8" />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-brand-dark">{user.name || "Ребенок"}</h2>
              <Badge
                variant="secondary"
                className="bg-brand-primary-soft text-brand-warning-strong"
              >
                Ребенок
              </Badge>
            </div>
            <span className="text-xs text-brand-muted">
              {user.telegram ? `@${user.telegram}` : "Telegram аккаунт привязан"}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 border-t border-brand-muted/15 pt-3 text-xs text-brand-muted">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-brand-success" />
            <span>Статус авторизации: Активен (Telegram initData)</span>
          </div>
          <div className="flex items-center gap-2">
            <PhoneCall className="h-4 w-4 text-brand-muted" />
            <span>Телефон: {user.phone || "Не указан"}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
