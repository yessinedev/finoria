import React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

interface EntitySelectProps<T> {
  label: string
  id: string
  value: string
  onChange: (value: string) => void
  options: T[]
  getOptionLabel: (option: T) => string
  getOptionValue: (option: T) => string
  placeholder?: string
  required?: boolean
  className?: string
}

export function EntitySelect<T>({
  label,
  id,
  value,
  onChange,
  options,
  getOptionLabel,
  getOptionValue,
  placeholder = "Sélectionner...",
  required = false,
  className = "",
}: EntitySelectProps<T>) {
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange} required={required}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={getOptionValue(option)} value={getOptionValue(option)}>
              {getOptionLabel(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
