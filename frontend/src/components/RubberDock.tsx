"use client"

import React, { useCallback, useEffect, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"
import type { LucideIcon } from "lucide-react"
import { S, tune, step, clamp, spring } from "@/lib/motion"
import { cn } from "@/lib/utils"

export interface DockItem {
  label: string
  href: string
  icon: LucideIcon
}

interface RubberDockProps {
  items: DockItem[]
  onSelect?: (index: number, href: string) => void
}

const TAB = 64
const GAP = 4
const PAD = 4

export function RubberDock({ items, onSelect }: RubberDockProps) {
  const pathname = usePathname()
  const router = useRouter()

  const n = items.length
  const tw = n * TAB + Math.max(0, n - 1) * GAP

  const activeIdx = Math.max(
    0,
    items.findIndex((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)),
  )

  const cx = useCallback((i: number) => i * (TAB + GAP) + TAB / 2, [])

  const dockRef = useRef<HTMLDivElement | null>(null)
  const indicatorRef = useRef<HTMLDivElement | null>(null)
  const topIconRef = useRef<HTMLDivElement | null>(null)
  const rafRef = useRef<number | null>(null)

  const reduceMotion = useRef(false)

  const L = useRef(S(cx(activeIdx) - TAB / 2))
  const R = useRef(S(cx(activeIdx) + TAB / 2))
  const nudge = useRef(S(0))

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

  // Индекс кнопки, над которой сейчас капсула (обновляем вручную, а не в RAF)
  const [underIdx, setUnderIdx] = React.useState(activeIdx)

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

  useEffect(() => {
    const match = window.matchMedia("(prefers-reduced-motion: reduce)")
    reduceMotion.current = match.matches

    const dir = Math.sign(cx(activeIdx) - (L.current.x + R.current.x) / 2)
    moveTo(cx(activeIdx), dir)
    setUnderIdx(activeIdx)
  }, [activeIdx, cx, moveTo])

  useEffect(() => {
    let lastTime = performance.now()

    const frame = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 1 / 30)
      lastTime = now

      const sub = 4
      for (let k = 0; k < sub; k++) {
        const d = dt / sub
        step(L.current, d)
        step(R.current, d)
        step(nudge.current, d)
      }

      const ind = indicatorRef.current
      const dock = dockRef.current
      const top = topIconRef.current

      if (ind && dock && top) {
        let l = L.current.x
        let r = R.current.x
        if (r < l) [l, r] = [r, l]

        const iw = Math.max(r - l, 24)
        const trackH = 64 - 2 * PAD
        const ih = iw >= TAB ? trackH : Math.max(trackH - 8, trackH * (iw / TAB))
        const topOffset = (trackH - ih) / 2

        ind.style.width = `${iw}px`
        ind.style.height = `${ih}px`
        ind.style.borderRadius = `${ih / 2}px`
        ind.style.transform = `translate3d(${l}px, ${topOffset}px, 0)`

        // Белая иконка едет вместе с капсулой (центр капсулы)
        const cxNow = l + iw / 2
        top.style.transform = `translate3d(${cxNow - TAB / 2}px, ${topOffset}px, 0)`
        top.style.width = `${TAB}px`
        top.style.height = `${ih}px`

        dock.style.transform = `translateX(${nudge.current.x}px)`

        // Обновляем underIdx только когда капсула остановилась (не drag)
        if (!drag.current?.live) {
          const nearest = clamp(Math.round((cxNow - cx(0)) / (TAB + GAP)), 0, n - 1)
          setUnderIdx((prev) => (prev === nearest ? prev : nearest))
        }
      }

      rafRef.current = requestAnimationFrame(frame)
    }

    rafRef.current = requestAnimationFrame(frame)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [tw, cx, n])

  const rubber = (x: number, min: number, max: number, d = 46) =>
    x < min
      ? min - (1 - 1 / (((min - x) * 0.55) / d + 1)) * d
      : x > max
        ? max + (1 - 1 / (((x - max) * 0.55) / d + 1)) * d
        : x

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    drag.current = { id: e.pointerId, x0: e.clientX, last: e.clientX, live: false, dir: 0 }
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
    const localX = e.clientX - rect.left - PAD
    const clamped = rubber(localX, cx(0), cx(n - 1))

    moveTo(clamped, d.dir, true)
    nudge.current.t = (clamped - clamp(clamped, cx(0), cx(n - 1))) * 0.35
  }

  const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || e.pointerId !== d.id) return

    if (d.live) {
      const center = (L.current.t + R.current.t) / 2
      nudge.current.t = 0

      const newIndex = Math.round((center - cx(0)) / (TAB + GAP) + d.dir * 0.18)
      const clamped = clamp(newIndex, 0, n - 1)

      if (clamped !== activeIdx) {
        const target = items[clamped]
        if (onSelect) onSelect(clamped, target.href)
        else router.push(target.href)
      }
      setUnderIdx(clamped)

      suppressClick.current = true
      setTimeout(() => (suppressClick.current = false), 0)
    }
    drag.current = null
  }

  const onCancel = () => {
    drag.current = null
    nudge.current.t = 0
    moveTo(cx(activeIdx), 0)
    setUnderIdx(activeIdx)
  }

  const onClick = (idx: number, href: string) => {
    if (suppressClick.current) return
    if (idx !== activeIdx) {
      if (onSelect) onSelect(idx, href)
      else router.push(href)
    }
  }

  const ActiveIcon = items[underIdx]?.icon
  const activeLabel = items[underIdx]?.label

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex justify-center pointer-events-none pb-[env(safe-area-inset-bottom)]">
      <div
        ref={dockRef}
        style={{ width: tw + 2 * PAD }}
        className="relative flex h-16 items-center gap-1 rounded-full border border-app-surface/60 bg-app-card/90 p-1 shadow-[var(--shadow-soft)] backdrop-blur-xl select-none pointer-events-auto touch-none"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onCancel}
      >
        {/* Серые кнопки — скрываем ту, над которой капсула */}
        {items.map((item, idx) => {
          const Icon = item.icon
          return (
            <button
              key={item.href}
              type="button"
              onClick={() => onClick(idx, item.href)}
              className={cn(
                "relative z-10 flex h-full w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-full text-text-muted transition-opacity duration-150",
                idx === underIdx ? "opacity-0" : "opacity-100",
              )}
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

        {/* Одна белая иконка — едет вместе с капсулой */}
        {ActiveIcon && (
          <div
            ref={topIconRef}
            className="pointer-events-none absolute left-0 top-0 z-20 flex flex-col items-center justify-center gap-0.5 text-brand-action-text"
            style={{ willChange: "transform, width, height" }}
          >
            <ActiveIcon className="h-5 w-5" />
            <span className="text-[10px] font-medium leading-none">{activeLabel}</span>
          </div>
        )}
      </div>
    </div>
  )
}
