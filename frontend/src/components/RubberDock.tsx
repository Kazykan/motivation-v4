"use client"

import React, { useCallback, useEffect, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"
import type { LucideIcon } from "lucide-react"
import { S, tune, step, clamp, spring } from "@/lib/motion"

export interface DockItem {
  label: string
  href: string
  icon: LucideIcon
}

interface RubberDockProps {
  items: DockItem[]
  onSelect?: (index: number, href: string) => void
}

const TAB = 64 // Ширина одной кнопки
const GAP = 4 // Отступ между кнопками
const PAD = 4 // = p-1 в Tailwind (1 unit = 4px)

export function RubberDock({ items, onSelect }: RubberDockProps) {
  const pathname = usePathname()
  const router = useRouter()

  const n = items.length
  // Общая ширина всех кнопок с отступами
  const tw = n * TAB + Math.max(0, n - 1) * GAP

  // Определяем активный индекс
  const activeIdx = Math.max(
    0,
    items.findIndex((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)),
  )

  // Центр i-й кнопки относительно начала контейнера
  const cx = useCallback((i: number) => PAD + i * (TAB + GAP) + TAB / 2, [])

  const dockRef = useRef<HTMLDivElement | null>(null)
  const indicatorRef = useRef<HTMLDivElement | null>(null)
  const topIconsRef = useRef<HTMLDivElement | null>(null)
  const rafRef = useRef<number | null>(null)

  const reduceMotion = useRef(false)

  // Пружины для левого и правого края индикатора (как в оригинале)
  const L = useRef(S(cx(activeIdx) - TAB / 2))
  const R = useRef(S(cx(activeIdx) + TAB / 2))

  // Пружина для "наклона" (nudge) всего дока при драге
  const nudge = useRef(S(0))

  // Токены пружин (берем из CSS или дефолты)
  const tokens = useRef({
    lead: spring("--dock-lead", "640 38"),
    trail: spring("--dock-trail", "150 16"),
    dragLead: spring("--dock-drag-lead", "1100 56"),
    dragTrail: spring("--dock-drag-trail", "320 26"),
  })

  const drag = useRef<{
    id: number | null
    x0: number
    last: number
    live: boolean
    dir: number
  } | null>(null)
  const suppressClick = useRef(false)

  // Функция движения индикатора
  const moveTo = useCallback((center: number, dir: number, isDrag = false) => {
    const { lead, trail, dragLead, dragTrail } = tokens.current
    const leadSpring = isDrag ? dragLead : lead
    const trailSpring = isDrag ? dragTrail : trail

    if (dir === 0) {
      tune(L.current, 600, 44, reduceMotion.current)
      tune(R.current, 600, 44, reduceMotion.current)
    } else {
      const [leftSpring, rightSpring] =
        dir > 0 ? [trailSpring, leadSpring] : [leadSpring, trailSpring]
      tune(L.current, ...leftSpring, reduceMotion.current)
      tune(R.current, ...rightSpring, reduceMotion.current)
    }
    L.current.t = center - TAB / 2
    R.current.t = center + TAB / 2
  }, [])

  // Синхронизация при смене URL
  useEffect(() => {
    const match = window.matchMedia("(prefers-reduced-motion: reduce)")
    reduceMotion.current = match.matches

    const dir = Math.sign(cx(activeIdx) - (L.current.x + R.current.x) / 2)
    moveTo(cx(activeIdx), dir)
  }, [activeIdx, cx, moveTo])

  // Основной цикл анимации
  useEffect(() => {
    let lastTime = performance.now()

    const frame = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 1 / 30)
      lastTime = now

      // Делаем несколько подшагов для стабильности
      const sub = 4
      for (let k = 0; k < sub; k++) {
        const d = dt / sub
        step(L.current, d)
        step(R.current, d)
        step(nudge.current, d)
      }

      const ind = indicatorRef.current
      const dock = dockRef.current
      const top = topIconsRef.current

      if (ind && dock && top) {
        let l = L.current.x
        let r = R.current.x
        if (r < l) [l, r] = [r, l]

        const iw = Math.max(r - l, 24)

        // Высота: если ширина = ширине кнопки, то высота = высоте кнопки (64).
        // Если шире — плавно уменьшаем до 48, чтобы сохранить "капсулу".
        const trackH = 64 - 2 * PAD // 56
        const ih = iw >= TAB ? trackH : Math.max(trackH - 8, trackH * (iw / TAB))
        const topOffset = PAD + (trackH - ih) / 2 // +PAD, т.к. трек начинается с 4px

        ind.style.width = `${iw}px`
        ind.style.height = `${ih}px`
        ind.style.borderRadius = `${ih / 2}px`
        ind.style.transform = `translate3d(${l}px, ${topOffset}px, 0)`

        // Клип верхнего слоя
        const lLocal = l - PAD // переводим из координат дока в координаты трека
        const iwLocal = iw
        top.style.clipPath = `inset(${(trackH - ih) / 2}px ${tw - lLocal - iwLocal}px ${(trackH - ih) / 2}px ${lLocal}px round ${ih / 2}px)`

        dock.style.transform = `translateX(${nudge.current.x}px)`
      }

      rafRef.current = requestAnimationFrame(frame)
    }

    rafRef.current = requestAnimationFrame(frame)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [tw])

  const rubber = (x: number, min: number, max: number, d = 46) =>
    x < min
      ? min - (1 - 1 / (((min - x) * 0.55) / d + 1)) * d
      : x > max
        ? max + (1 - 1 / (((x - max) * 0.55) / d + 1)) * d
        : x

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    drag.current = {
      id: e.pointerId,
      x0: e.clientX,
      last: e.clientX,
      live: false,
      dir: 0,
    }
  }

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || e.pointerId !== d.id) return

    if (!d.live && Math.abs(e.clientX - d.x0) > 4) {
      d.live = true
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    }
    if (!d.live) return

    const delta = e.clientX - d.last
    d.last = e.clientX
    if (Math.abs(delta) > 0.5) d.dir = Math.sign(delta)

    const rect = dockRef.current?.getBoundingClientRect()
    if (!rect) return
    // Вычисляем локальную координату пальца внутри дока
    const localX = e.clientX - rect.left
    const clamped = rubber(localX, cx(0), cx(n - 1))

    moveTo(clamped, d.dir, true)
    // Если палец ушел за край, док немного наклоняется
    nudge.current.t = (clamped - clamp(clamped, cx(0), cx(n - 1))) * 0.35
  }

  const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || e.pointerId !== d.id) return

    if (d.live) {
      const center = (L.current.t + R.current.t) / 2
      nudge.current.t = 0

      // Находим ближайший таб
      const newIndex = Math.round((center - cx(0)) / (TAB + GAP) + d.dir * 0.18)
      const clamped = clamp(newIndex, 0, n - 1)

      if (clamped !== activeIdx) {
        const target = items[clamped]
        if (onSelect) onSelect(clamped, target.href)
        else router.push(target.href)
      }

      suppressClick.current = true
      setTimeout(() => (suppressClick.current = false), 0)
    }
    drag.current = null
  }

  const onCancel = () => {
    drag.current = null
    nudge.current.t = 0
    moveTo(cx(activeIdx), 0)
  }

  const onClick = (idx: number, href: string) => {
    if (suppressClick.current) return
    if (idx !== activeIdx) {
      if (onSelect) onSelect(idx, href)
      else router.push(href)
    }
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex justify-center pointer-events-none pb-[env(safe-area-inset-bottom)]">
      <div
        ref={dockRef}
        style={{ width: tw + 2 * PAD }}
        className="relative flex h-16 items-center gap-1 rounded-full border border-app-surface/60 bg-app-card/90 shadow-[var(--shadow-soft)] backdrop-blur-xl select-none pointer-events-auto touch-none"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onCancel}
      >
        {/* Слой серых иконок */}
        {items.map((item, idx) => {
          const Icon = item.icon
          return (
            <button
              key={item.href}
              type="button"
              onClick={() => onClick(idx, item.href)}
              className="relative z-10 flex h-full w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-full text-text-muted transition-colors"
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </button>
          )
        })}

        {/* Зелёный индикатор */}
        <div
          ref={indicatorRef}
          className="pointer-events-none absolute left-0 top-0 rounded-full bg-brand-action"
          style={{ willChange: "transform, width, height" }}
        />

        {/* Слой белых иконок (клипается по индикатору) */}
        <div
          ref={topIconsRef}
          style={{
            clipPath: "inset(0 100% 0 0 round 9999px)",
            willChange: "clip-path",
          }}
          className="pointer-events-none absolute inset-1 z-20 flex items-center gap-1 text-brand-action-text"
        >
          {items.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.href}
                className="flex h-full w-16 shrink-0 flex-col items-center justify-center gap-0.5"
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium leading-none">{item.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
