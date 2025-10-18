"use client"

import type React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface FormStepProps {
  title: string
  description: string
  children: React.ReactNode
  onNext?: () => void
  onPrev?: () => void
  nextLabel?: string
  prevLabel?: string
  isFirstStep?: boolean
  isLastStep?: boolean
  canProceed?: boolean
  className?: string
}

export function FormStep({
  title,
  description,
  children,
  onNext,
  onPrev,
  nextLabel = "Next",
  prevLabel = "Previous",
  isFirstStep = false,
  isLastStep = false,
  canProceed = true,
  className,
}: FormStepProps) {
  return (
    <Card className={cn("w-full max-w-2xl mx-auto", className)}>
      <CardHeader>
        <CardTitle className="text-2xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {children}

        <div className="flex justify-between pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onPrev}
            disabled={isFirstStep}
            className={cn(isFirstStep && "invisible")}
          >
            {prevLabel}
          </Button>

          <Button type="button" onClick={onNext} disabled={!canProceed}>
            {isLastStep ? "Complete Setup" : nextLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
