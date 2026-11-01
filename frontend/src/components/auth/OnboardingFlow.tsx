"use client"

import { useState } from "react"
import { RoleStep } from "./RoleStep"
import { ParentStep } from "./ParentStep"
import { ChildStep } from "./ChildStep"
import { OnboardingFlowProps, OnboardingStep } from "@/types/props"

export function OnboardingFlow({ onDone }: OnboardingFlowProps) {
  const [step, setStep] = useState<OnboardingStep>("role")

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
