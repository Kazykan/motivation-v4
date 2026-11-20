// frontend/src/lib/motion.ts
export type SpringState = { x: number; v: number; t: number; k: number; c: number }

export const S = (x: number, k = 400, c = 30): SpringState => ({ x, v: 0, t: x, k, c })

export const tune = (s: SpringState, k: number, c: number, reduceMotion = false) => {
  s.k = k
  s.c = reduceMotion ? 2 * Math.sqrt(k) : c
}

export const step = (s: SpringState, dt: number) => {
  const a = -s.k * (s.x - s.t) - s.c * s.v
  s.v += a * dt
  s.x += s.v * dt
}

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

// Читаем токены из CSS (--dock-lead и т.д.)
export const token = (name: string, fallback = "") =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback

export const spring = (name: string, fallback: string): [number, number] =>
  token(name, fallback).split(/\s+/).map(Number) as [number, number]
