import axios from "axios"

const isTestMode = process.env.NEXT_PUBLIC_TEST_MODE === "true"

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    "Content-Type": "application/json",
    ...(isTestMode && {
      "X-Parent-Telegram-Id": process.env.NEXT_PUBLIC_PARENT_TELEGRAM_ID || "",
      "X-Child-Telegram-Id": process.env.NEXT_PUBLIC_CHILD_TELEGRAM_ID || "",
    }),
  },
})
