"use client"

import { useState } from "react"
import { RoleStep } from "./RoleStep"
import { ParentStep } from "./ParentStep"
import { ChildStep } from "./ChildStep"
import { OnboardingSlides } from "@/components/onboarding/OnboardingSlides"
import { ONBOARDING_STORAGE_KEY } from "@/lib/onboardingContent"
import { OnboardingFlowProps, OnboardingStep } from "@/types/props"

function getInitialStep(): OnboardingStep {
  if (typeof window === "undefined") return "role"
  return localStorage.getItem(ONBOARDING_STORAGE_KEY) ? "role" : "slides"
}

export function OnboardingFlow({ onDone }: OnboardingFlowProps) {
  const [step, setStep] = useState<OnboardingStep>(getInitialStep)

  if (step === "slides") {
    return (
      <OnboardingSlides
        onDone={() => {
          localStorage.setItem(ONBOARDING_STORAGE_KEY, "1")
          setStep("role")
        }}
      />
    )
  }

  if (step === "role") {
    return (
      <RoleStep onSelectParent={() => setStep("parent")} onSelectChild={() => setStep("child")} />
    )
  }

  if (step === "parent") {
    return <ParentStep onBack={() => setStep("role")} onCreated={onDone} onJoined={onDone} />
  }

  return <ChildStep onBack={() => setStep("role")} onJoined={onDone} />
}
