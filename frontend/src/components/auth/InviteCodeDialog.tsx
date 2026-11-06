"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Copy, Check } from "lucide-react"
import { InviteCodeDialogProps } from "@/types/props"

export function InviteCodeDialog({
  open,
  code,
  expiresAt,
  onOpenChange,
  onGenerateNew,
}: InviteCodeDialogProps) {
  const [copied, setCopied] = useState(false)
  const [generating, setGenerating] = useState(false)

  const copyCode = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleGenerate = async () => {
    if (!onGenerateNew) return
    setGenerating(true)
    try {
      await onGenerateNew()
    } finally {
      setGenerating(false)
    }
  }

  const expiresLabel = expiresAt
    ? new Date(expiresAt).toLocaleString("ru-RU", {
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Код приглашения</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <p className="text-xs text-brand-muted">Передайте код ребёнку или второму родителю.</p>

          {code ? (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-brand-dark p-4 text-white">
              {code.split("").map((digit, idx) => (
                <span key={idx} className="text-2xl font-bold tracking-widest text-brand-primary">
                  {digit}
                </span>
              ))}
              <Button
                variant="ghost"
                size="icon"
                className="ml-2 text-white hover:text-brand-primary"
                onClick={copyCode}
              >
                {copied ? (
                  <Check className="h-5 w-5 text-brand-success" />
                ) : (
                  <Copy className="h-5 w-5" />
                )}
              </Button>
            </div>
          ) : (
            <div className="rounded-xl bg-brand-surface-alt p-4 text-center text-xs text-brand-muted">
              Код пока не создан
            </div>
          )}

          {expiresLabel && (
            <p className="text-center text-[11px] text-brand-muted">Действует до {expiresLabel}</p>
          )}
        </div>

        {onGenerateNew && (
          <DialogFooter>
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full bg-brand-primary text-brand-dark hover:bg-brand-primary-hover"
            >
              {generating ? "Генерируем..." : "Сгенерировать новый"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
