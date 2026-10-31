import { authApi } from "@/services/authApi"
import { useState } from "react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"

type Step = "choose" | "enter-code"

export function RoleSelectScreen({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<Step>("choose")
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function registerParent() {
    setLoading(true)
    setError(null)
    try {
      await authApi.registerParent()
      onDone()
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Не удалось создать семью")
    } finally {
      setLoading(false)
    }
  }

  async function joinFamily() {
    setLoading(true)
    setError(null)
    try {
      await authApi.joinFamily(code.trim())
      onDone()
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Неверный код")
    } finally {
      setLoading(false)
    }
  }

  if (step === "choose") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6">
        <h1 className="text-xl font-bold">Как вы будете пользоваться приложением?</h1>
        <div className="flex w-full max-w-xs flex-col gap-3">
          <Button
            onClick={registerParent}
            disabled={loading}
            className="h-14 justify-start text-left"
          >
            <div>
              <div className="font-semibold">Я родитель</div>
              <div className="text-xs opacity-80">Создам семью и приглашу детей</div>
            </div>
          </Button>
          <Button
            variant="outline"
            onClick={() => setStep("enter-code")}
            className="h-14 justify-start text-left"
          >
            <div>
              <div className="font-semibold">У меня есть код</div>
              <div className="text-xs text-muted-foreground">4-значный код от родителя</div>
            </div>
          </Button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6">
      <h1 className="text-xl font-bold">Введите код приглашения</h1>
      <p className="text-sm text-muted-foreground text-center max-w-xs">
        Попросите родителя открыть раздел «Дети» → «Добавить ребёнка» и продиктовать 4-символьный
        код.
      </p>
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        maxLength={4}
        placeholder="ABCD"
        className="text-center text-2xl tracking-[0.5em] uppercase h-14 max-w-xs"
      />
      <Button
        onClick={joinFamily}
        disabled={code.length !== 4 || loading}
        className="w-full max-w-xs h-12"
      >
        {loading ? "Проверяем..." : "Присоединиться"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setStep("choose")
          setError(null)
          setCode("")
        }}
      >
        ← Назад
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
