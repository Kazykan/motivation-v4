"use client"

import { useEffect, useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bell, Share, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/axios"

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function PushNotificationSettings() {
  const [status, setStatus] = useState<
    "loading" | "unsupported" | "ios-browser" | "denied" | "ready"
  >("loading")
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)

  const [sending, setSending] = useState(false)
  const [testMsg, setTestMsg] = useState<string | null>(null)

  const handleTest = async () => {
    setSending(true)
    setTestMsg(null)
    try {
      await api.post("/push/test")
      setTestMsg("Уведомление отправлено")
    } catch (e: any) {
      setTestMsg(e.response?.data?.error || "Не удалось отправить")
    } finally {
      setSending(false)
    }
  }

  useEffect(() => {
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true

    if (isIos && !isStandalone) {
      setStatus("ios-browser")
      return
    }

    if (
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setStatus("unsupported")
      return
    }

    if (Notification.permission === "denied") {
      setStatus("denied")
      return
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        setIsSubscribed(!!sub)
        setStatus("ready")
      })
      .catch(() => setStatus("unsupported"))
  }, [])

  const handleToggle = async (checked: boolean) => {
    if (busy) return
    setBusy(true)

    try {
      const reg = await navigator.serviceWorker.ready

      if (checked) {
        // Подписка
        const permission = await Notification.requestPermission()
        if (permission !== "granted") {
          setStatus(permission === "denied" ? "denied" : "ready")
          setIsSubscribed(false)
          return
        }

        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        })

        const json = sub.toJSON()
        await api.post("/push/subscribe", {
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
        })

        setIsSubscribed(true)
      } else {
        // Отписка
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await api.post("/push/unsubscribe", { endpoint: sub.endpoint })
          await sub.unsubscribe()
        }
        setIsSubscribed(false)
      }
    } catch (e) {
      console.error("Ошибка управления подпиской:", e)
    } finally {
      setBusy(false)
    }
  }

  if (status === "loading" || status === "unsupported") return null

  return (
    <Card className="border-app-surface bg-app-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-text-main">
          <Bell className="h-4 w-4 text-text-muted" />
          Уведомления
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {status === "ios-browser" && (
          <div className="flex items-start gap-2 rounded-xl bg-app-surface p-3 text-xs text-text-muted">
            <Share className="mt-0.5 h-4 w-4 shrink-0 text-text-main" />
            <span>
              Чтобы включить уведомления на iPhone, нажмите <strong>«Поделиться»</strong> внизу
              экрана и выберите <strong>«На экран Домой»</strong>.
            </span>
          </div>
        )}

        {status === "denied" && (
          <p className="text-xs text-finance-negative">
            Уведомления заблокированы в настройках браузера или телефона. Разрешите их в настройках
            устройства.
          </p>
        )}

        {status === "ready" && (
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-text-main">Push-уведомления</span>
              <span className="text-xs text-text-muted">
                Напоминания о заданиях и итогах недели
              </span>
            </div>
            <Switch checked={isSubscribed} onCheckedChange={handleToggle} disabled={busy} />
            <Button
              variant="outline"
              size="sm"
              className="mt-3 h-8 gap-1.5"
              disabled={!isSubscribed || sending}
              onClick={handleTest}
            >
              <Send className="h-3.5 w-3.5" />
              {sending ? "Отправка…" : "Отправить тест"}
            </Button>
            {testMsg && <p className="mt-2 text-[11px] text-text-muted">{testMsg}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
