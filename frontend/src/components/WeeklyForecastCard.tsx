"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { WeeklyForecast } from "@/types/props"
import { formatMoney } from "@/lib/money"

interface Props {
  forecast: WeeklyForecast
  title: string
  closeable?: boolean
  onClose?: () => void
}

export function WeeklyForecastCard({ forecast, title, closeable, onClose }: Props) {
  return (
    <Card className="border-brand-muted/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-brand-dark">{title}</CardTitle>
          <span className="text-xs text-brand-muted">
            {forecast.weekStart} — {forecast.weekEnd}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-brand-muted">Максимум</span>
            <p className="text-base font-bold text-brand-dark">
              {formatMoney(forecast.summary.planned)}
            </p>
          </div>
          <div>
            <span className="text-brand-muted">Прогноз</span>
            <p className="text-base font-bold text-brand-success">
              {formatMoney(forecast.summary.forecast)}
            </p>
          </div>
          <div>
            <span className="text-brand-muted">Заработано</span>
            <p className="font-semibold text-brand-dark">{formatMoney(forecast.summary.earned)}</p>
          </div>
          <div>
            <span className="text-brand-muted">На проверке</span>
            <p className="font-semibold text-brand-warning">
              {formatMoney(forecast.summary.pendingAmount)}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-brand-muted/15 pt-3">
          {forecast.items.map((item) => (
            <div key={item.taskId} className="flex items-center justify-between text-xs">
              <span className="text-brand-dark">{item.title}</span>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-brand-surface-alt text-brand-muted">
                  {item.approvedCount}/{item.plannedRuns}
                </Badge>
                <span className="font-semibold text-brand-dark">{formatMoney(item.earned)}</span>
              </div>
            </div>
          ))}
          {forecast.items.length === 0 && (
            <span className="text-xs text-brand-muted">Нет активных заданий</span>
          )}
        </div>

        {closeable && (
          <Button
            className="w-full bg-brand-primary font-semibold text-brand-dark hover:bg-brand-primary-hover"
            onClick={onClose}
          >
            Закрыть неделю
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
