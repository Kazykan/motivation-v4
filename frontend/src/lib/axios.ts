import axios from "axios"

// Клиент → всегда относительные пути (свой origin, Route Handlers).
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

// Сервер → внутренний адрес Django (Route Handlers).
// API_INTERNAL_URL задаётся в .env (например, http://127.0.0.1:8000).
export const serverApi = axios.create({
  baseURL: process.env.API_INTERNAL_URL || "http://127.0.0.1:8000",
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
})
