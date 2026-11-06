"use client"

import { useEffect, useState } from "react"
import { commonApi } from "@/services/commonApi"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LogOut, RefreshCw } from "lucide-react"
import { ProfileCard } from "@/components/ProfileCard"

export default function ChildProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const fetchUserData = async () => {
    try {
      const data = await commonApi.getMe()
      setUser(data)
    } catch (error) {
      console.error("Ошибка загрузки профиля:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUserData()
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold tracking-tight text-brand-dark">Профиль</h1>

      {loading ? (
        <div className="py-8 text-center text-sm text-brand-muted">Загрузка профиля...</div>
      ) : (
        <div className="flex flex-col gap-4">
          <ProfileCard user={user || {}} />

          <Card className="border-brand-muted/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-brand-dark">
                Настройки сессии
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-0">
              <p className="text-xs text-brand-muted">
                Приложение авторизовано через защищенный протокол Telegram WebApp.
              </p>
              <div className="flex items-center gap-2 pt-2">
                <Button variant="outline" size="sm" className="h-8 flex-1" onClick={fetchUserData}>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  Обновить сессию
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-8 flex-1"
                  onClick={() => console.log("Выход")}
                >
                  <LogOut className="mr-1.5 h-3.5 w-3.5" />
                  Выйти
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
