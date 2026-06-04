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
import { X } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import type { Member } from "@/types/api";

interface EditMemberRoleDialogProps {
  member: Member | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (id: string, role: string) => Promise<void>;
  open: boolean;
}

export function EditMemberRoleDialog({
  member,
  onOpenChange,
  onSubmit,
  open,
}: EditMemberRoleDialogProps) {
  const [role, setRole] = useState("user");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setRole(member?.role ?? "user");
  }, [member, open]);

  const saveRole = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!member) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(member.id, role);
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
            Change role
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
        <form className="flex flex-col gap-6" onSubmit={saveRole}>
          <FieldGroup className="gap-6">
            <Field className="gap-2.5">
              <FieldLabel className="font-bold text-[#6f7d82] text-xs leading-4 tracking-[0.01em]">
                Role{member ? ` for ${member.name}` : ""}
              </FieldLabel>
              <select
                className="h-10 rounded-[7px] border border-[#d4e0e4] bg-[#f9fbfb] px-[9px] py-[7px] text-[#30363a] text-base hover:border-[#c1d2d8] focus-visible:border-[#a8d8e6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(21,152,202,0.12)]"
                onChange={(e) => setRole(e.target.value)}
                value={role}
              >
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </Field>
          </FieldGroup>
          <DialogFooter className="justify-end sm:justify-end">
            <Button
              className="min-w-[132px] rounded-full px-4 text-base"
              disabled={isSubmitting}
              type="submit"
              variant="rdio-primary"
            >
              {isSubmitting ? "Saving..." : "Save role"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
