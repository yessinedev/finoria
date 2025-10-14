"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface FormInputProps {
  label: string
  id: string
  value: string
  onChange: (value: string) => void
  error?: string
  type?: string
  placeholder?: string
  step?: string
  required?: boolean
  className?: string
}

export function FormInput({
  label,
  id,
  value,
  onChange,
  error,
  type = "text",
  placeholder,
  required = false,
  step,
  className,
}: FormInputProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        step={step}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn("w-full", error && "border-destructive focus-visible:ring-destructive")}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
