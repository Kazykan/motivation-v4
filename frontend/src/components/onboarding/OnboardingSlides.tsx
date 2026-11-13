"use client"

import { useState, useEffect } from "react"
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel"
import { Button } from "@/components/ui/button"
import { OnboardingSlide } from "./OnboardingSlide"
import { OnboardingDots } from "./OnboardingDots"
import { ONBOARDING_SLIDES } from "@/lib/onboardingContent"
import { OnboardingSlidesProps } from "@/types/props"

export function OnboardingSlides({ onDone }: OnboardingSlidesProps) {
  const [api, setApi] = useState<CarouselApi>()
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (!api) return
    setActive(api.selectedScrollSnap())

    const onSelect = () => setActive(api.selectedScrollSnap())
    api.on("select", onSelect)
    return () => {
      api.off("select", onSelect)
    }
  }, [api])

  const isLast = active === ONBOARDING_SLIDES.length - 1

  const handleNext = () => {
    if (isLast) {
      onDone()
      return
    }
    api?.scrollNext()
  }

  return (
    <div className="-mx-4 -mt-6 flex min-h-[100dvh] flex-col pb-8">
      {/* Кнопка «Пропустить» */}
      <div className="flex justify-end px-4 pt-4">
        <button
          type="button"
          onClick={onDone}
          className="text-xs font-medium text-text-muted hover:text-text-main"
        >
          Пропустить
        </button>
      </div>

      {/* Карусель */}
      <div className="flex-1">
        <Carousel setApi={setApi} opts={{ loop: false }} className="h-full">
          <CarouselContent className="h-full">
            {ONBOARDING_SLIDES.map((slide, i) => (
              <CarouselItem key={i} className="h-full">
                <OnboardingSlide data={slide} />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>

      {/* Точки + кнопка */}
      <div className="mt-6 flex flex-col items-center gap-4 px-6">
        <OnboardingDots total={ONBOARDING_SLIDES.length} active={active} />
        <Button
          onClick={handleNext}
          className="h-12 w-full max-w-xs rounded-button bg-brand-action text-base font-semibold text-brand-action-text hover:bg-brand-action-hover"
        >
          {isLast ? "Начать" : "Далее"}
        </Button>
      </div>
    </div>
  )
}
