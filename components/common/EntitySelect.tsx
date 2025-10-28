import React from "react";
import { SearchableEntitySelect } from "@/components/common/SearchableEntitySelect";

interface EntitySelectProps<T> {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: T[];
  getOptionLabel: (option: T) => string;
  getOptionValue: (option: T) => string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  error?: string | null;
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
  error,
}: EntitySelectProps<T>) {
  return (
    <SearchableEntitySelect
      label={label}
      id={id}
      value={value}
      onChange={onChange}
      options={options}
      getOptionLabel={getOptionLabel}
      getOptionValue={getOptionValue}
      placeholder={placeholder}
      required={required}
      className={className}
      error={error}
    />
  );
}