"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DEBUG_JSON } from "@/lib/debug"

interface DebugJsonPanelProps {
  title?: string
  data: unknown
}

export function DebugJsonPanel({ title = "Debug JSON", data }: DebugJsonPanelProps) {
  if (!DEBUG_JSON) return null

  let json = ""
  try {
    json = JSON.stringify(data, null, 2)
  } catch {
    json = String(data)
  }

  return (
    <Card className="border-dashed border-brand-error/40 bg-brand-error-soft/30">
      <CardHeader className="pb-2">
        <CardTitle className="font-mono text-xs text-brand-error-strong">
          {title} · {json.length} bytes
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <pre className="max-h-[60vh] overflow-auto rounded-md bg-white p-3 text-[11px] leading-tight text-brand-dark">
          {json}
        </pre>
      </CardContent>
    </Card>
  )
}
