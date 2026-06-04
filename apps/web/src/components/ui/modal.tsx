import { X } from "lucide-react";
import type React from "react";

export function Modal({
  children,
  onClose,
  title,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="modal-backdrop">
      <button
        aria-label="Close modal"
        className="modal-backdrop-close"
        onClick={onClose}
        type="button"
      />
      <section
        aria-label={title}
        aria-modal="true"
        className="modal-panel"
        role="dialog"
      >
        <div className="modal-header">
          <strong>{title}</strong>
          <button aria-label="Close modal" onClick={onClose} type="button">
            <X aria-hidden="true" size={15} strokeWidth={1.8} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
