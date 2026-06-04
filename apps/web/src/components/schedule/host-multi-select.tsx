import { Badge } from "@rdio/ui/components/badge";
import { Button } from "@rdio/ui/components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@rdio/ui/components/command";
import { Field, FieldLabel } from "@rdio/ui/components/field";
import { Input } from "@rdio/ui/components/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@rdio/ui/components/popover";
import { cn } from "@rdio/ui/lib/utils";
import { ChevronDown, X } from "lucide-react";
import { useState } from "react";

interface HostMultiSelectProps {
  createPlaceholder?: string;
  disabled?: boolean;
  label?: string;
  multiple?: boolean;
  onChange: (value: string[]) => void;
  onCreateOption?: (value: string) => void;
  options: string[];
  placeholder?: string;
  value: string[];
}

const formControlClassName =
  "h-10 rounded-[5px] border-[#d6e0e3] bg-white px-[9px] py-[7px] text-[#30363a] text-base hover:border-[#c1d2d8] focus-visible:border-[#a8d8e6] focus-visible:ring-[rgba(21,152,202,0.12)]";

const optionClassName =
  "mb-1.5 min-h-8 rounded-[4px] px-3 py-0 font-semibold text-[#4f5c61] text-base last:mb-0 data-[selected=true]:bg-[#f3fafc] data-[selected=true]:text-[#1598ca] data-[checked=true]:bg-[#eef6f8] data-[checked=true]:text-[#2f6f7f] data-[checked=true]:[&_svg]:text-[#1598ca]";

export function HostMultiSelect({
  options,
  value,
  onChange,
  disabled = false,
  placeholder = "Select…",
  multiple = true,
  label,
  onCreateOption,
  createPlaceholder = "Add new…",
}: HostMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [createValue, setCreateValue] = useState("");

  const setOpen = (nextOpen: boolean) => {
    if (disabled) {
      return;
    }

    setIsOpen(nextOpen);
  };

  const toggleOption = (option: string) => {
    if (disabled) {
      return;
    }

    if (multiple) {
      onChange(
        value.includes(option)
          ? value.filter((item) => item !== option)
          : [...value, option]
      );
      return;
    }

    onChange(value.includes(option) ? [] : [option]);
    setIsOpen(false);
  };

  const removeValue = (option: string) => {
    if (disabled) {
      return;
    }

    onChange(value.filter((item) => item !== option));
  };

  const createOption = () => {
    const normalized = createValue.trim();

    if (!(normalized && onCreateOption)) {
      return;
    }

    onCreateOption(normalized);

    if (multiple) {
      onChange(value.includes(normalized) ? value : [...value, normalized]);
    } else {
      onChange([normalized]);
      setIsOpen(false);
    }

    setCreateValue("");
  };

  const control = (
    <Popover onOpenChange={setOpen} open={isOpen && !disabled}>
      <PopoverTrigger
        render={
          <div
            aria-disabled={disabled}
            aria-expanded={isOpen && !disabled}
            aria-haspopup="listbox"
            className={cn(
              "flex min-h-10 w-full items-center justify-between gap-2 rounded-[5px] border border-[#d6e0e3] bg-white px-[9px] py-1.5 text-left outline-none hover:border-[#c1d2d8] focus-visible:border-[#a8d8e6] focus-visible:ring-2 focus-visible:ring-[rgba(21,152,202,0.12)]",
              isOpen &&
                !disabled &&
                "border-[#a8d8e6] ring-2 ring-[rgba(21,152,202,0.12)]",
              disabled && "cursor-not-allowed bg-[#f4f7f8] text-[#9aa6aa]"
            )}
            role="combobox"
            tabIndex={disabled ? -1 : 0}
          />
        }
      >
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {value.length === 0 ? (
            <span className="px-1 text-[#9aa6aa] text-sm">{placeholder}</span>
          ) : (
            value.map((item) => (
              <Badge
                className="h-7 rounded-full border-[#cfe6ed] bg-[#eef6f8] px-2 text-[#3f6f7b] text-sm"
                key={item}
                variant="outline"
              >
                {item}
                {multiple && !disabled ? (
                  <button
                    aria-label={`Remove ${item}`}
                    className="ml-1 inline-flex size-[18px] items-center justify-center rounded-full text-[#7e9aa3] hover:bg-[#d9edf3] hover:text-[#1598ca] focus-visible:bg-[#d9edf3] focus-visible:text-[#1598ca] focus-visible:outline-none"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      removeValue(item);
                    }}
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    type="button"
                  >
                    <X aria-hidden="true" size={12} strokeWidth={2} />
                  </button>
                ) : null}
              </Badge>
            ))
          )}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "size-5 shrink-0 text-[#879297] transition-transform",
            isOpen && !disabled && "rotate-180"
          )}
          data-icon="inline-end"
        />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--anchor-width)] min-w-80 max-w-[calc(100vw-2rem)] gap-1 rounded-[6px] border-[#d6e0e3] p-1 shadow-[0_12px_28px_rgba(42,61,67,0.12)]"
      >
        <Command className="gap-1 rounded-[6px] bg-white p-0 [&_[data-slot=input-group]]:h-10 [&_[data-slot=input-group]]:rounded-[5px] [&_[data-slot=input-group]]:border-[#d6e0e3] [&_[data-slot=input-group]]:bg-white [&_[data-slot=input-group]]:focus-within:border-[#a8d8e6] [&_[data-slot=input-group]]:focus-within:ring-2 [&_[data-slot=input-group]]:focus-within:ring-[rgba(21,152,202,0.12)]">
          <CommandInput
            className="text-base placeholder:text-[#9aa6aa]"
            placeholder="Search hosts..."
          />
          <CommandList className="border-[#e6edef] border-t pt-1">
            <CommandEmpty>No options found.</CommandEmpty>
            <CommandGroup className="p-0">
              {options.map((option) => (
                <CommandItem
                  className={optionClassName}
                  data-checked={value.includes(option)}
                  key={option}
                  onSelect={() => toggleOption(option)}
                  value={option}
                >
                  <span>{option}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
        {onCreateOption ? (
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-1.5 border-[#e6edef] border-t px-1 py-1.5">
            <Input
              className={formControlClassName}
              onChange={(event) => setCreateValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  createOption();
                }
              }}
              placeholder={createPlaceholder}
              value={createValue}
            />
            <Button
              className="h-10 rounded-[5px] px-3 text-base"
              disabled={!createValue.trim()}
              onClick={createOption}
              type="button"
              variant="rdio-chrome"
            >
              Add
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );

  if (!label) {
    return control;
  }

  return (
    <Field className="gap-1.5">
      <FieldLabel className="font-bold text-[#6f7d82] text-xs leading-4 tracking-[0.01em]">
        {label}
      </FieldLabel>
      {control}
    </Field>
  );
}
