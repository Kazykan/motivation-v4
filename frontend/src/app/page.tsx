"use client"

import { useEffect, useState } from "react"

type SdkStatus = {
  sdkLoaded: boolean
  inTelegram: boolean
}

export default function Home() {
  const [status, setStatus] = useState<SdkStatus | null>(null)

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp
    setStatus({
      sdkLoaded: !!tg,
      inTelegram: tg?.platform && tg.platform !== "unknown",
    })
  }, [])

  if (!status) return <div className="p-6 text-sm">Загрузка…</div>

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-lg font-bold">Telegram Mini App</h1>

      <div className="rounded-lg bg-slate-100 p-3 text-xs space-y-1">
        <div>
          SDK загружен: <b>{String(status.sdkLoaded)}</b>
        </div>
        <div>
          Открыто в Telegram: <b>{String(status.inTelegram)}</b>
        </div>
      </div>

      {!status.sdkLoaded && (
        <div className="rounded-lg bg-rose-50 p-3 text-xs text-rose-800">
          SDK Telegram не загрузился. Проверьте сеть и блокировщики.
        </div>
      )}

      {status.sdkLoaded && !status.inTelegram && (
        <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
          SDK загружен, но приложение открыто вне Telegram. Авторизация недоступна.
        </div>
      )}
    </div>
  )
}
