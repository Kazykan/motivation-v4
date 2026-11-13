"use client"

import Image from "next/image"
import { OnboardingSlideProps } from "@/types/props"

export function OnboardingSlide({ data }: OnboardingSlideProps) {
  return (
    <div className="flex h-full w-full flex-col">
      {/* Картинка с маской по 4 сторонам */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: "3 / 4" }}>
        <Image
          src={data.src}
          alt={data.alt}
          fill
          priority
          sizes="(max-width: 448px) 100vw, 448px"
          className="object-cover"
        />

        {/* Маска: растворяем края в фоне #e9ecef (--color-app-bg) */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: "linear-gradient(to bottom, #e9ecef 0%, rgba(233,236,239,0) 22%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4"
          style={{
            background: "linear-gradient(to bottom, rgba(233,236,239,0) 0%, #e9ecef 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-12"
          style={{
            background: "linear-gradient(to right, #e9ecef 0%, rgba(233,236,239,0) 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-12"
          style={{
            background: "linear-gradient(to left, #e9ecef 0%, rgba(233,236,239,0) 100%)",
          }}
        />
      </div>

      {/* Текст под картинкой */}
      <div className="mt-4 flex flex-col items-center gap-2 px-6 text-center">
        <h2 className="text-xl font-semibold leading-tight text-text-main">{data.title}</h2>
        <p className="max-w-xs text-sm leading-relaxed text-text-muted">{data.subtitle}</p>
      </div>
    </div>
  )
}
