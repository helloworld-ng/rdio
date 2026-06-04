import { Badge } from "@rdio/ui/components/badge";
import { Button } from "@rdio/ui/components/button";
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
import { cn } from "@rdio/ui/lib/utils";
import { X } from "lucide-react";
import { type CSSProperties, type FormEvent, useEffect, useState } from "react";
import { type HostColorId, hostPalette } from "@/components/HostAvatar";
import type { HostRecord } from "@/types/host";

interface HostDialogProps {
  host?: HostRecord | null;
  hosts: HostRecord[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (host: HostRecord) => Promise<void>;
  open: boolean;
}

export function HostDialog({
  host,
  hosts,
  onOpenChange,
  onSubmit,
  open,
}: HostDialogProps) {
  const [name, setName] = useState("");
  const [colorId, setColorId] = useState<HostColorId>(hostPalette[0].id);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dialogTitle = host ? "Edit host" : "New host";
  const submitLabel = host ? "Update host" : "Add host";

  useEffect(() => {
    if (!open) {
      return;
    }

    setName(host?.name ?? "");
    setColorId((host?.colorId as HostColorId | undefined) ?? hostPalette[0].id);
    setError("");
  }, [host, open]);

  const saveHost = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedName = name.trim();
    const isDuplicate = hosts.some(
      (existingHost) =>
        existingHost.name === normalizedName && existingHost.name !== host?.name
    );

    if (!normalizedName) {
      setError("Host name is required.");
      return;
    }

    if (isDuplicate) {
      setError("A host with this name already exists.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      await onSubmit({ colorId, name: normalizedName });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
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
        <form className="flex flex-col gap-6" onSubmit={saveHost}>
          <FieldGroup className="gap-6">
            <Field className="gap-2.5">
              <FieldLabel className="font-bold text-[#6f7d82] text-xs leading-4 tracking-[0.01em]">
                Host name
              </FieldLabel>
              <Input
                className="h-10 rounded-[7px] border-[#d4e0e4] bg-[#f9fbfb] px-[9px] py-[7px] text-[#30363a] text-base hover:border-[#c1d2d8] focus-visible:border-[#a8d8e6] focus-visible:ring-[rgba(21,152,202,0.12)]"
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Maya Stone"
                value={name}
              />
            </Field>
            <fieldset>
              <legend className="mb-2.5 font-bold text-[#6f7d82] text-xs leading-4 tracking-[0.01em]">
                Color
              </legend>
              <div className="flex flex-wrap gap-2">
                {hostPalette.map((color) => (
                  <label className="cursor-pointer" key={color.id}>
                    <input
                      checked={colorId === color.id}
                      className="sr-only"
                      name="host-color"
                      onChange={() => setColorId(color.id)}
                      type="radio"
                      value={color.id}
                    />
                    <Badge
                      className={cn(
                        "h-7 border-2 px-4",
                        colorId === color.id
                          ? "border-[#1598ca] shadow-[0_0_0_1px_rgba(21,152,202,0.16)]"
                          : "border-transparent"
                      )}
                      style={
                        {
                          "--rdio-host-bg": color.background,
                          "--rdio-host-fg": color.foreground,
                        } as CSSProperties
                      }
                      variant="rdio-host"
                    >
                      {color.label}
                    </Badge>
                  </label>
                ))}
              </div>
            </fieldset>
            {error ? <p className="form-error">{error}</p> : null}
          </FieldGroup>
          <DialogFooter className="justify-end sm:justify-end">
            <Button
              className="min-w-[132px] rounded-full px-4 text-base"
              disabled={isSubmitting || !name.trim()}
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
