import { Suspense } from "react"
import { ProfileClient } from "./ProfileClient"

export default function ChildProfilePage() {
  return (
    <Suspense
      fallback={<div className="py-8 text-center text-sm text-text-muted">Загрузка профиля...</div>}
    >
      <ProfileClient />
    </Suspense>
  )
}
