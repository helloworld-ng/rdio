import { Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

export function UserAccountMenu({
  firstName,
  onLogout,
}: {
  firstName: string;
  onLogout: () => void;
}) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="user-account-menu" ref={rootRef}>
      <button
        aria-controls={menuId}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="user-account-trigger"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <span>{firstName}</span>
        <ChevronDown aria-hidden="true" size={14} strokeWidth={1.8} />
      </button>
      {isOpen ? (
        <div className="user-account-dropdown" id={menuId} role="menu">
          <Link
            className="user-account-dropdown-item"
            onClick={() => setIsOpen(false)}
            role="menuitem"
            to="/profile"
          >
            Profile
          </Link>
          <button
            className="user-account-dropdown-item"
            onClick={() => {
              setIsOpen(false);
              onLogout();
            }}
            role="menuitem"
            type="button"
          >
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
}
