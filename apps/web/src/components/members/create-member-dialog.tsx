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
import { X } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { PasswordInput } from "@/components/auth/password-input";
import type { CreateMemberInput } from "@/types/api";

interface CreateMemberDialogProps {
  onOpenChange: (open: boolean) => void;
  onSubmit: (member: CreateMemberInput) => Promise<void>;
  open: boolean;
}

export function CreateMemberDialog({
  onOpenChange,
  onSubmit,
  open,
}: CreateMemberDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setName("");
    setEmail("");
    setPassword("");
    setError("");
  }, [open]);

  const createMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const input = {
      email: email.trim(),
      name: name.trim(),
      password,
    };

    if (!(input.name && input.email && input.password)) {
      setError("Name, email, and temporary password are required.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      await onSubmit(input);
      onOpenChange(false);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Could not create member."
      );
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
            New member
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
        <form className="flex flex-col gap-6" onSubmit={createMember}>
          <FieldGroup className="gap-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Field className="gap-2.5">
                <FieldLabel className="font-bold text-[#6f7d82] text-xs leading-4 tracking-[0.01em]">
                  Name
                </FieldLabel>
                <Input
                  autoComplete="name"
                  className="h-10 rounded-[7px] border-[#d4e0e4] bg-white px-[9px] py-[7px] text-[#30363a] text-base hover:border-[#c1d2d8] focus-visible:border-[#a8d8e6] focus-visible:ring-[rgba(21,152,202,0.12)]"
                  onChange={(event) => setName(event.target.value)}
                  value={name}
                />
              </Field>
              <Field className="gap-2.5">
                <FieldLabel className="font-bold text-[#6f7d82] text-xs leading-4 tracking-[0.01em]">
                  Email
                </FieldLabel>
                <Input
                  autoComplete="email"
                  className="h-10 rounded-[7px] border-[#d4e0e4] bg-white px-[9px] py-[7px] text-[#30363a] text-base hover:border-[#c1d2d8] focus-visible:border-[#a8d8e6] focus-visible:ring-[rgba(21,152,202,0.12)]"
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  value={email}
                />
              </Field>
            </div>
            <Field className="gap-2.5">
              <FieldLabel className="font-bold text-[#6f7d82] text-xs leading-4 tracking-[0.01em]">
                Temporary password
              </FieldLabel>
              <PasswordInput
                autoComplete="new-password"
                className="min-w-0 px-[9px] py-[7px] text-[#30363a] text-base"
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                ref={passwordRef}
                value={password}
              />
            </Field>
            {error ? <p className="form-error">{error}</p> : null}
          </FieldGroup>
          <DialogFooter className="justify-end sm:justify-end">
            <Button
              className="min-w-[132px] rounded-full px-4 text-base"
              disabled={
                isSubmitting || !(name.trim() && email.trim() && password)
              }
              type="submit"
              variant="rdio-primary"
            >
              {isSubmitting ? "Creating..." : "Add member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
