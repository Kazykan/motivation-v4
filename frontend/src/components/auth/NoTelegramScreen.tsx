import { Button } from "../ui/button"
import { Separator } from "../ui/separator"
import { Apple, Copyleft } from "lucide-react"

const BOT_URL = process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL ?? ""

export function NoTelegramScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="text-6xl">✈️</div>
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-bold">Откройте приложение в Telegram</h1>
        <p className="text-sm text-muted-foreground">
          Это мини-приложение работает только внутри Telegram. Нажмите кнопку ниже, чтобы открыть
          бота.
        </p>
      </div>
      <Button className="w-full max-w-xs">
        <a href={BOT_URL} target="_blank" rel="noopener noreferrer">
          Открыть Telegram-бота
        </a>
      </Button>
      <div className="flex w-full max-w-xs items-center gap-3 text-xs text-muted-foreground">
        <Separator className="flex-1" />
        или
        <Separator className="flex-1" />
      </div>
      <div className="flex w-full max-w-xs flex-col gap-2">
        <Button variant="outline" disabled title="Скоро">
          <Copyleft /> Продолжить с Google
        </Button>
        <Button variant="outline" disabled title="Скоро">
          <Apple /> Продолжить с Apple
        </Button>
      </div>
    </div>
  )
}
