import React from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface FormFieldProps {
  label: string
  id: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  placeholder?: string
  type?: string
  textarea?: boolean
  required?: boolean
  error?: string | null
  className?: string
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  id,
  value,
  onChange,
  placeholder,
  type = "text",
  textarea = false,
  required = false,
  error,
  className = "",
}) => (
  <div className={className}>
    <Label htmlFor={id}>{label}</Label>
    {textarea ? (
      <Textarea
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={3}
        required={required}
      />
    ) : (
      <Input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
      />
    )}
    {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
  </div>
)
