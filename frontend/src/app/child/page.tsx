"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function ChildIndexPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/child/tasks")
  }, [router])
  return null
}
