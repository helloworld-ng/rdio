import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@rdio/ui/components/alert-dialog";
import { Button } from "@rdio/ui/components/button";
import { X } from "lucide-react";
import { useState } from "react";

interface DeleteConfirmationDialogProps {
  confirmLabel?: string;
  entityName?: string;
  onConfirm: () => Promise<void>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
}

/** Shared destructive confirmation dialog for app records. */
export function DeleteConfirmationDialog({
  confirmLabel = "Delete",
  entityName,
  onConfirm,
  onOpenChange,
  open,
  title,
}: DeleteConfirmationDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDelete = async () => {
    setIsDeleting(true);

    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent className="w-[min(520px,calc(100vw-3rem))] max-w-none gap-[18px] rounded-xl border border-[#d9e3e6] bg-white p-[18px] text-[#30363a] shadow-[0_26px_60px_rgba(36,54,61,0.2)] ring-0 sm:max-w-none">
        <AlertDialogHeader className="flex grid-rows-none flex-row items-center justify-between border-[#dfe8ea] border-b pb-3 text-left">
          <AlertDialogTitle className="font-semibold text-[#30363a] text-[17px] leading-5">
            {title}
          </AlertDialogTitle>
          <AlertDialogCancel
            className="inline-flex size-7 items-center justify-center rounded-[5px] border border-transparent bg-transparent p-0 text-[#879297] hover:border-[#d4e4e8] hover:bg-[#f5fbfc] hover:text-[#1598ca] focus-visible:border-[#d4e4e8] focus-visible:bg-[#f5fbfc] focus-visible:text-[#1598ca] focus-visible:outline-none"
            size="icon-sm"
            variant="ghost"
          >
            <X aria-hidden="true" size={17} strokeWidth={1.9} />
            <span className="sr-only">Close</span>
          </AlertDialogCancel>
        </AlertDialogHeader>
        <AlertDialogDescription className="text-[#5f6b70] text-sm leading-6">
          Permanently delete{" "}
          <strong className="font-semibold text-[#30363a]">
            {entityName ?? "this item"}
          </strong>
          ? This cannot be undone.
        </AlertDialogDescription>
        <AlertDialogFooter className="flex-row justify-end gap-2">
          <AlertDialogCancel
            className="rounded-full px-4"
            variant="rdio-chrome"
          >
            Cancel
          </AlertDialogCancel>
          <Button
            className="rounded-full px-4 text-base"
            disabled={isDeleting}
            onClick={() => confirmDelete().catch(() => undefined)}
            type="button"
            variant="rdio-destructive"
          >
            {isDeleting ? "Deleting..." : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
