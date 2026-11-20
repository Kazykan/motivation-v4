"use client"

import { useEffect, useRef, useCallback } from "react"
import { usePathname, useRouter } from "next/navigation"
import { S, tune, step, clamp, spring, SpringState } from "@/lib/motion"

export interface DockItem {
  href: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
}

interface RubberDockProps {
  items: DockItem[]
}

const TAB = 56
const GAP = 4
const COL_H = TAB + 12

export function RubberDock({ items }: RubberDockProps) {
  const router = useRouter()
  const pathname = usePathname()
  const reduceMotion = useRef(false)
  const N = items.length

  const dockRef = useRef<HTMLDivElement>(null)
  const indicatorRef = useRef<HTMLDivElement>(null)
  const topIconsRef = useRef<HTMLDivElement>(null)

  const cx = useCallback((i: number) => TAB / 2 + i * (TAB + GAP), [])
  const TW = N * TAB + (N - 1) * GAP

  const L = useRef(S(cx(0) - TAB / 2))
  const R = useRef(S(cx(0) + TAB / 2))
  const nudge = useRef(S(0))
  const pops = useRef(items.map(() => S(1)))
  const W = useRef(S(TW + 12))

  const drag = useRef<{
    id: number | null
    x0: number
    last: number
    live: boolean
    dir: number
  } | null>(null)
  const suppressClick = useRef(false)

  const tokens = useRef({
    lead: spring("--dock-lead", "640 38"),
    trail: spring("--dock-trail", "150 16"),
    dragLead: spring("--dock-drag-lead", "1100 56"),
    dragTrail: spring("--dock-drag-trail", "320 26"),
  })

  // Активный таб: startsWith, чтобы /child/tasks/123 подсвечивал «Задания»
  const activeIndex = items.findIndex((item) => pathname.startsWith(item.href))
  const active = activeIndex >= 0 ? activeIndex : 0

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

  // Начальная установка при смене items (роль переключилась)
  useEffect(() => {
    const match = window.matchMedia("(prefers-reduced-motion: reduce)")
    reduceMotion.current = match.matches

    pops.current = items.map(() => S(1))
    const center = cx(active)
    L.current.x = center - TAB / 2
    R.current.x = center + TAB / 2
    L.current.t = L.current.x
    R.current.t = R.current.x
    W.current.t = TW + 12
    nudge.current.v = 5
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length])

  // rAF-цикл
  useEffect(() => {
    let raf: number
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
        step(W.current, d)
        pops.current.forEach((p) => step(p, d))
      }

      const ind = indicatorRef.current
      const dock = dockRef.current
      const top = topIconsRef.current

      if (ind && dock && top) {
        let l = L.current.x
        let r = R.current.x
        if (r < l) [l, r] = [r, l]

        const iw = Math.max(r - l, 24)
        const ih = TAB * clamp(1 / Math.sqrt(iw / TAB), 0.66, 1.1)
        const topOffset = (TAB - ih) / 2

        ind.style.width = `${iw}px`
        ind.style.height = `${ih}px`
        ind.style.borderRadius = `${ih / 2}px`
        ind.style.transform = `translate3d(${l}px, ${topOffset}px, 0)`

        top.style.clipPath = `inset(${topOffset}px ${TW - l - iw}px ${TAB - topOffset - ih}px ${l}px round ${ih / 2}px)`

        dock.style.transform = `translateX(calc(-50% + ${nudge.current.x}px))`
      }

      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [TW])

  const rubber = (x: number, min: number, max: number, d = 46) =>
    x < min
      ? min - (1 - 1 / (((min - x) * 0.55) / d + 1)) * d
      : x > max
        ? max + (1 - 1 / (((x - max) * 0.55) / d + 1)) * d
        : x

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = {
      id: e.pointerId,
      x0: e.clientX,
      last: e.clientX,
      live: false,
      dir: 0,
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
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
    const localX = e.clientX - (rect.left + rect.width / 2) + TW / 2
    const clamped = rubber(localX, cx(0), cx(N - 1))

    moveTo(clamped, d.dir, true)
    nudge.current.t = (clamped - clamp(clamped, cx(0), cx(N - 1))) * 0.35
  }

  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d || e.pointerId !== d.id) return

    if (d.live) {
      const center = (L.current.t + R.current.t) / 2
      nudge.current.t = 0
      const newIndex = Math.round((center - cx(0)) / (TAB + GAP) + d.dir * 0.18)
      const clamped = clamp(newIndex, 0, N - 1)

      // Навигация только если таб сменился
      if (clamped !== active) router.push(items[clamped].href)

      suppressClick.current = true
      setTimeout(() => (suppressClick.current = false), 0)
    }
    drag.current = null
  }

  const onClick = (index: number) => {
    if (suppressClick.current) return
    if (index !== active) router.push(items[index].href)
  }

  useEffect(() => {
    const dir = Math.sign(cx(active) - (L.current.x + R.current.x) / 2)
    moveTo(cx(active), dir)
    if (pops.current[active]) pops.current[active].v -= 3.2
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  return (
    <div
      ref={dockRef}
      className="relative h-[68px] rounded-[34px] bg-app-card overflow-hidden"
      style={{ width: `${W.current.t}px` }}
    >
      <div
        className="absolute inset-0 flex gap-1 items-center justify-center"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {items.map((item, i) => {
          const Icon = item.icon
          return (
            <button
              key={item.href}
              onClick={() => onClick(i)}
              className="w-14 h-14 flex items-center justify-center rounded-full text-text-muted"
              aria-label={item.label}
            >
              <Icon size={22} />
            </button>
          )
        })}
      </div>

      <div
        ref={indicatorRef}
        className="absolute left-0 top-0 bg-brand-action rounded-full pointer-events-none"
        style={{ width: 56, height: 56 }}
      />

      <div
        ref={topIconsRef}
        className="absolute inset-0 flex gap-1 items-center justify-center pointer-events-none"
        aria-hidden="true"
        style={{ clipPath: "inset(0 100% 0 0 round 28px)" }}
      >
        {items.map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.href}
              className="w-14 h-14 flex items-center justify-center text-brand-action-text"
            >
              <Icon size={22} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
