import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@rdio/ui/components/command";
import { Field, FieldLabel } from "@rdio/ui/components/field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@rdio/ui/components/popover";
import { cn } from "@rdio/ui/lib/utils";
import { ChevronDown, Upload } from "lucide-react";
import { useState } from "react";

export interface MediaSearchOption {
  id: string;
  name: string;
  type: "audio" | "image";
}

const optionClassName =
  "mb-1.5 min-h-8 rounded-[4px] px-3 py-1.5 font-semibold text-[#4f5c61] text-sm last:mb-0 data-[selected=true]:bg-[#f3fafc] data-[selected=true]:text-[#1598ca] data-[checked=true]:bg-[#eef6f8] data-[checked=true]:text-[#2f6f7f] data-[checked=true]:[&_svg]:text-[#1598ca]";

export function MediaSearchSelect({
  disabled = false,
  options,
  selectedId,
  onSelect,
  onUploadClick,
}: {
  disabled?: boolean;
  options: MediaSearchOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onUploadClick: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((o) => o.id === selectedId);

  const handleOpenChange = (next: boolean) => {
    if (!disabled) {
      setIsOpen(next);
    }
  };

  return (
    <Field className="gap-1.5">
      <FieldLabel className="font-bold text-[#6f7d82] text-xs leading-4 tracking-[0.01em]">
        Media
      </FieldLabel>
      <Popover onOpenChange={handleOpenChange} open={isOpen && !disabled}>
        <PopoverTrigger
          render={
            <div
              aria-disabled={disabled}
              aria-expanded={isOpen && !disabled}
              aria-haspopup="listbox"
              className={cn(
                "flex h-10 w-full items-center justify-between gap-2 rounded-[5px] border border-[#d6e0e3] bg-white px-[9px] py-1.5 text-left outline-none hover:border-[#c1d2d8] focus-visible:border-[#a8d8e6] focus-visible:ring-2 focus-visible:ring-[rgba(21,152,202,0.12)]",
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
          <span
            className={cn(
              "truncate text-sm",
              !selectedOption && "text-[#9aa6aa]"
            )}
          >
            {selectedOption ? selectedOption.name : "Search library…"}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "size-5 shrink-0 text-[#879297] transition-transform",
              isOpen && !disabled && "rotate-180"
            )}
          />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[var(--anchor-width)] min-w-80 max-w-[calc(100vw-2rem)] gap-1 rounded-[6px] border-[#d6e0e3] p-1 shadow-[0_12px_28px_rgba(42,61,67,0.12)]"
        >
          <Command className="gap-1 rounded-[6px] bg-white p-0 [&_[data-slot=input-group]]:h-10 [&_[data-slot=input-group]]:rounded-[5px] [&_[data-slot=input-group]]:border-[#d6e0e3] [&_[data-slot=input-group]]:bg-white [&_[data-slot=input-group]]:focus-within:border-[#a8d8e6] [&_[data-slot=input-group]]:focus-within:ring-2 [&_[data-slot=input-group]]:focus-within:ring-[rgba(21,152,202,0.12)]">
            <CommandInput
              className="text-base placeholder:text-[#9aa6aa]"
              placeholder="Search library..."
            />
            <CommandList className="border-[#e6edef] border-t pt-1">
              <CommandEmpty className="py-4 text-center text-[#879297] text-sm">
                {options.length === 0
                  ? "No media in library yet."
                  : "No matches found."}
              </CommandEmpty>
              <CommandGroup className="p-0">
                {options.map((option) => (
                  <CommandItem
                    className={optionClassName}
                    data-checked={option.id === selectedId}
                    key={option.id}
                    onSelect={() => {
                      onSelect(option.id);
                      setIsOpen(false);
                    }}
                    value={option.name}
                  >
                    <span className="flex flex-col">
                      <span>{option.name}</span>
                      <span className="font-normal text-[#9aa6aa] text-xs">
                        {option.type}
                      </span>
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
          <div className="border-[#e6edef] border-t px-1 py-1.5">
            <button
              className="flex w-full items-center gap-2 rounded-[4px] px-3 py-2 font-semibold text-[#1598ca] text-sm hover:bg-[#f3fafc]"
              onClick={() => {
                setIsOpen(false);
                onUploadClick();
              }}
              type="button"
            >
              <Upload aria-hidden="true" size={14} strokeWidth={1.8} />
              Upload new file
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </Field>
  );
}
