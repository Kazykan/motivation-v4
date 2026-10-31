"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { WeeklyForecast } from "@/types/props"

interface Props {
  forecast: WeeklyForecast
  title: string
  closeable?: boolean
  onClose?: () => void
}

const fmt = (v: string | number) =>
  new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(Number(v)) + " ₽"

export function WeeklyForecastCard({ forecast, title, closeable, onClose }: Props) {
  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-900">{title}</CardTitle>
          <span className="text-xs text-slate-500">
            {forecast.weekStart} — {forecast.weekEnd}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-slate-500">Максимум</span>
            <p className="text-base font-bold text-slate-900">{fmt(forecast.summary.planned)}</p>
          </div>
          <div>
            <span className="text-slate-500">Прогноз</span>
            <p className="text-base font-bold text-emerald-600">{fmt(forecast.summary.forecast)}</p>
          </div>
          <div>
            <span className="text-slate-500">Заработано</span>
            <p className="font-semibold text-slate-900">{fmt(forecast.summary.earned)}</p>
          </div>
          <div>
            <span className="text-slate-500">На проверке</span>
            <p className="font-semibold text-amber-600">{fmt(forecast.summary.pendingAmount)}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-100 pt-3">
          {forecast.items.map((item) => (
            <div key={item.taskId} className="flex items-center justify-between text-xs">
              <span className="text-slate-700">{item.title}</span>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                  {item.approvedCount}/{item.plannedRuns}
                </Badge>
                <span className="font-semibold text-slate-900">{fmt(item.earned)}</span>
              </div>
            </div>
          ))}
          {forecast.items.length === 0 && (
            <span className="text-xs text-slate-500">Нет активных заданий</span>
          )}
        </div>

        {closeable && (
          <Button
            className="w-full bg-amber-400 text-slate-900 hover:bg-amber-500 font-semibold"
            onClick={onClose}
          >
            Закрыть неделю
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
