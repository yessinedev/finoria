"use client"

import { CompanyInfo, OnboardingData, TaxInfo } from "@/types/types"
import { useState } from "react"



const initialData: OnboardingData = {
  companyInfo: {
    name: "",
    address: "",
    email: "",
    phone: "",
    website: "",
    city: "",
    country: "",
  },
  taxInfo: {
    taxId: "",
    taxStatus: "",
    tvaNumber: undefined,
  },
  
}

export function useOnboarding() {
  const [currentStep, setCurrentStep] = useState(0)
  const [data, setData] = useState<OnboardingData>(initialData)

  const steps = ["Company Info", "Tax Info"]

  const updateCompanyInfo = (info: Partial<CompanyInfo>) => {
    setData((prev) => ({
      ...prev,
      companyInfo: { ...prev.companyInfo, ...info },
    }))
  }

  const updateTaxInfo = (info: Partial<TaxInfo>) => {
    setData((prev) => ({
      ...prev,
      taxInfo: { ...prev.taxInfo, ...info },
    }))
  }

  

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const goToStep = (step: number) => {
    if (step >= 0 && step < steps.length) {
      setCurrentStep(step)
    }
  }

  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === steps.length - 1

  const reset = () => {
    setCurrentStep(0)
    setData(initialData)
  }

  return {
    currentStep,
    steps,
    data,
    updateCompanyInfo,
    updateTaxInfo,
    nextStep,
    prevStep,
    goToStep,
    isFirstStep,
    isLastStep,
    reset,
  }
}
