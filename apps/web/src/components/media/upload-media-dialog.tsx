import { Button } from "@rdio/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@rdio/ui/components/dialog";
import { X } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { FileUploadField } from "@/components/FileUploadField";
import type { MediaItem } from "@/types/station";

interface UploadMediaDialogProps {
  onOpenChange: (open: boolean) => void;
  onSubmit: (file: File) => Promise<MediaItem>;
  open: boolean;
}

export function UploadMediaDialog({
  onOpenChange,
  onSubmit,
  open,
}: UploadMediaDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setSelectedFile(null);
    setError("");
  }, [open]);

  const uploadMedia = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedFile) {
      return;
    }

    setError("");
    setIsUploading(true);

    try {
      await onSubmit(selectedFile);
      onOpenChange(false);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Upload failed. Please try again."
      );
    } finally {
      setIsUploading(false);
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
            Upload media
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
        <form className="flex flex-col gap-4" onSubmit={uploadMedia}>
          <FileUploadField
            accept="audio/*,image/*"
            emptyLabel="Choose audio or image"
            file={selectedFile}
            label="Media file"
            onChange={(nextFile) => {
              setError("");
              setSelectedFile(nextFile);
            }}
          />
          {error ? <p className="form-error">{error}</p> : null}
          <DialogFooter className="justify-end sm:justify-end">
            <Button
              className="min-w-[132px] rounded-full px-4 text-base"
              disabled={!selectedFile || isUploading}
              type="submit"
              variant="rdio-primary"
            >
              {isUploading ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
