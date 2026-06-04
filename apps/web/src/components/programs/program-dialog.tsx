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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@rdio/ui/components/dialog";
import { Field, FieldGroup, FieldLabel } from "@rdio/ui/components/field";
import { Input } from "@rdio/ui/components/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@rdio/ui/components/popover";
import { Textarea } from "@rdio/ui/components/textarea";
import { cn } from "@rdio/ui/lib/utils";
import { ChevronDown, X } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import type { Program } from "@/types/station";

interface ProgramDialogProps {
  hostNames: string[];
  mode: "create" | "edit";
  onAddHost: (hostName: string) => Promise<void>;
  onOpenChange: (open: boolean) => void;
  onSubmit: (program: Omit<Program, "id">) => Promise<void>;
  open: boolean;
  program?: Program | null;
}

const formControlClassName =
  "h-10 rounded-[5px] border-[#d6e0e3] bg-white px-[9px] py-[7px] text-[#30363a] text-base hover:border-[#c1d2d8] focus-visible:border-[#a8d8e6] focus-visible:ring-[rgba(21,152,202,0.12)]";

const hostPickerItemClassName =
  "mb-1.5 min-h-8 rounded-[4px] px-3 py-0 font-semibold text-[#4f5c61] text-base last:mb-0 data-[selected=true]:bg-[#f3fafc] data-[selected=true]:text-[#1598ca] data-[checked=true]:bg-[#eef6f8] data-[checked=true]:text-[#2f6f7f] data-[checked=true]:[&_svg]:text-[#1598ca]";

export function ProgramDialog({
  hostNames,
  mode,
  onAddHost,
  onOpenChange,
  onSubmit,
  open,
  program,
}: ProgramDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [host, setHost] = useState("");
  const [hostPickerOpen, setHostPickerOpen] = useState(false);
  const [newHostName, setNewHostName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dialogTitle = mode === "edit" ? "Edit program" : "New program";
  const submitLabel = mode === "edit" ? "Update program" : "Save program";

  useEffect(() => {
    if (!open) {
      return;
    }

    setTitle(program?.title ?? "");
    setDescription(program?.description ?? "");
    setHost(program?.host ?? hostNames[0] ?? "");
    setNewHostName("");
    setHostPickerOpen(false);
  }, [hostNames, open, program]);

  const submitProgram = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedTitle = title.trim();
    const normalizedDescription = description.trim();
    const selectedHost = host.trim();

    if (!(normalizedTitle && selectedHost)) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        description: normalizedDescription,
        host: selectedHost,
        title: normalizedTitle,
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const createHost = async () => {
    const normalizedHostName = newHostName.trim();

    if (!normalizedHostName) {
      return;
    }

    await onAddHost(normalizedHostName);
    setHost(normalizedHostName);
    setNewHostName("");
    setHostPickerOpen(false);
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="w-[min(720px,calc(100vw-3rem))] max-w-none gap-[18px] rounded-xl border border-[#d9e3e6] bg-white p-[18px] text-[#30363a] shadow-[0_26px_60px_rgba(36,54,61,0.2)] ring-0 sm:max-w-none"
        showCloseButton={false}
      >
        <DialogHeader className="flex-row items-center justify-between border-[#dfe8ea] border-b pb-3">
          <DialogTitle className="font-semibold text-[#30363a] text-[17px] leading-5">
            {dialogTitle}
          </DialogTitle>
          <DialogClose
            render={
              <button
                className="inline-flex size-7 items-center justify-center rounded-[5px] border border-transparent bg-transparent p-0 text-[#879297] hover:border-[#d4e4e8] hover:bg-[#f5fbfc] hover:text-[#1598ca] focus-visible:border-[#d4e4e8] focus-visible:bg-[#f5fbfc] focus-visible:text-[#1598ca] focus-visible:outline-none"
                type="button"
              />
            }
          >
            <X aria-hidden="true" size={17} strokeWidth={1.9} />
            <span className="sr-only">Close</span>
          </DialogClose>
        </DialogHeader>
        <form className="flex flex-col gap-6" onSubmit={submitProgram}>
          <FieldGroup className="gap-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Field className="gap-2.5">
                <FieldLabel className="font-bold text-[#6f7d82] text-xs leading-4 tracking-[0.01em]">
                  Program
                </FieldLabel>
                <Input
                  className={formControlClassName}
                  onChange={(event) => setTitle(event.target.value)}
                  value={title}
                />
              </Field>
              <Field className="gap-2.5">
                <FieldLabel className="font-bold text-[#6f7d82] text-xs leading-4 tracking-[0.01em]">
                  Host
                </FieldLabel>
                <Popover onOpenChange={setHostPickerOpen} open={hostPickerOpen}>
                  <PopoverTrigger
                    render={
                      <Button
                        className={cn(
                          "h-10 w-full justify-between rounded-[5px] border-[#d6e0e3] bg-white px-[9px] py-[7px] text-left font-normal text-base hover:border-[#c1d2d8] hover:bg-white focus-visible:border-[#a8d8e6] focus-visible:ring-[rgba(21,152,202,0.12)]",
                          !host && "text-muted-foreground"
                        )}
                        type="button"
                        variant="outline"
                      />
                    }
                  >
                    <span className="min-w-0 flex-1">
                      {host ? (
                        <Badge
                          className="h-7 rounded-full border-[#cfe6ed] bg-[#eef6f8] px-3 text-[#3f6f7b] text-sm"
                          variant="outline"
                        >
                          {host}
                        </Badge>
                      ) : (
                        "Select host"
                      )}
                    </span>
                    <ChevronDown
                      aria-hidden="true"
                      className="text-[#88969b]"
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
                        <CommandEmpty>No hosts found.</CommandEmpty>
                        <CommandGroup className="grid gap-1.5 p-0">
                          {hostNames.map((hostName) => (
                            <CommandItem
                              className={hostPickerItemClassName}
                              data-checked={hostName === host}
                              key={hostName}
                              onSelect={() => {
                                setHost(hostName);
                                setHostPickerOpen(false);
                              }}
                              value={hostName}
                            >
                              <span className="font-medium">{hostName}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-1.5 border-[#e6edef] border-t px-1 py-1.5">
                      <Input
                        className={formControlClassName}
                        onChange={(event) => setNewHostName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            createHost().catch(() => undefined);
                          }
                        }}
                        placeholder="New host name"
                        value={newHostName}
                      />
                      <Button
                        className="h-10 rounded-[5px] px-3 text-base"
                        disabled={!newHostName.trim()}
                        onClick={() => createHost().catch(() => undefined)}
                        type="button"
                        variant="rdio-chrome"
                      >
                        Add
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </Field>
            </div>
            <Field className="gap-2.5">
              <FieldLabel className="font-bold text-[#6f7d82] text-xs leading-4 tracking-[0.01em]">
                Description
              </FieldLabel>
              <Textarea
                className="min-h-[88px] rounded-[5px] border-[#d6e0e3] bg-white px-[9px] py-[7px] text-[#30363a] text-base hover:border-[#c1d2d8] focus-visible:border-[#a8d8e6] focus-visible:ring-[rgba(21,152,202,0.12)]"
                onChange={(event) => setDescription(event.target.value)}
                value={description}
              />
            </Field>
          </FieldGroup>
          <DialogFooter className="justify-start sm:justify-start">
            <Button
              className="min-w-[132px] rounded-full px-4 text-base"
              disabled={isSubmitting || !(title.trim() && host.trim())}
              type="submit"
              variant="rdio-primary"
            >
              {isSubmitting ? "Saving..." : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
