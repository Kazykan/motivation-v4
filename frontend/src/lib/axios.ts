// frontend/src/lib/axios.ts
import axios from "axios"

// ─────────────────────────────────────────────────────────────
// Клиент (браузер) — только относительные пути к своему origin
// ─────────────────────────────────────────────────────────────
export const api = axios.create({
  baseURL: "",
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
})

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const tgInitData = (window as any).Telegram?.WebApp?.initData
    if (tgInitData) {
      config.headers.Authorization = `tma ${tgInitData}`
    }
  }
  return config
})

// ─────────────────────────────────────────────────────────────
// Сервер (Node.js, только для Route Handlers) — к Django
// ─────────────────────────────────────────────────────────────
// ВАЖНО: этот блок исполняется при импорте модуля.
// Если файл попадёт в клиентский бандл — `Buffer` упадёт с
// ReferenceError, и роут вернёт 500. Поэтому импортировать
// `serverApi` разрешено ТОЛЬКО из `app/api/**/route.ts`
// (server-only файлы).

function buildBasicAuth(): string {
  const user = process.env.DJANGO_SUPERUSER_USERNAME ?? ""
  const pass = process.env.DJANGO_SUPERUSER_PASSWORD ?? ""
  if (!user || !pass) {
    // Не бросаем ошибку на этапе импорта — иначе весь build упадёт.
    // Лучше явно ругнуться при первом запросе.
    return ""
  }
  // Buffer доступен только на сервере
  return "Basic " + Buffer.from(`${user}:${pass}`).toString("base64")
}

const basicAuth = typeof Buffer !== "undefined" ? buildBasicAuth() : ""

export const serverApi = axios.create({
  baseURL: process.env.DJANGO_INTERNAL_URL || "http://127.0.0.1:8000",
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
    ...(basicAuth ? { Authorization: basicAuth } : {}),
  },
})

serverApi.interceptors.request.use((config) => {
  if (!basicAuth) {
    throw new Error(
      "DJANGO_SUPERUSER_USERNAME / DJANGO_SUPERUSER_PASSWORD не заданы в .env фронтенда",
    )
  }
  return config
})
