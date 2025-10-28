"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronDown } from "lucide-react";

interface StatusOption {
  value: string;
  label: string;
  variant?: "default" | "secondary" | "destructive" | "outline";
}

interface StatusDropdownProps {
  currentValue: string;
  options: StatusOption[];
  onStatusChange: (newValue: string) => void;
  disabled?: boolean;
  className?: string;
}

export function StatusDropdown({
  currentValue,
  options,
  onStatusChange,
  disabled = false,
  className = "",
}: StatusDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentOption = options.find(option => option.value === currentValue) || options[0];

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger 
        disabled={disabled}
        className={`flex items-center gap-1 ${className}`}
      >
        <Badge 
          variant={currentOption.variant || "secondary"}
          className="cursor-pointer hover:opacity-80 transition-opacity"
        >
          {currentOption.label}
          <ChevronDown className="ml-1 h-3 w-3" />
        </Badge>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => {
              onStatusChange(option.value);
              setIsOpen(false);
            }}
            className="flex items-center justify-between"
          >
            <span>{option.label}</span>
            {option.value === currentValue && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}