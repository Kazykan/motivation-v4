"use client"

import { Button } from "@/components/ui/button"

export function AuthButtons() {
  return (
    <div className="flex w-full max-w-xs flex-col gap-2">
      <Button
        variant="outline"
        className="h-11 w-full"
        onClick={() => (window.location.href = "/api/auth/google")}
      >
        Войти через Google
      </Button>

      <Button
        variant="outline"
        className="h-11 w-full"
        onClick={() => (window.location.href = "/api/auth/vk")}
      >
        Войти через VK ID
      </Button>
    </div>
  )
}
