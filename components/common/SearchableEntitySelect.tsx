import React, { useState, useMemo } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface SearchableEntitySelectProps<T> {
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

export function SearchableEntitySelect<T>({
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
}: SearchableEntitySelectProps<T>) {
  const [open, setOpen] = useState(false);
  
  // Find the selected option to display its label
  const selectedOption = useMemo(() => {
    return options.find(option => getOptionValue(option) === value);
  }, [options, value, getOptionValue]);

  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between",
              error ? "border-red-500" : "",
              !value && "text-muted-foreground"
            )}
          >
            {selectedOption ? getOptionLabel(selectedOption) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder={`Rechercher ${label.toLowerCase()}...`} />
            <CommandList>
              <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={getOptionValue(option)}
                    value={getOptionLabel(option)}
                    onSelect={() => {
                      onChange(getOptionValue(option));
                      setOpen(false);
                    }}
                  >
                    <div className="flex items-center">
                      <span>{getOptionLabel(option)}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
    </div>
  );
}