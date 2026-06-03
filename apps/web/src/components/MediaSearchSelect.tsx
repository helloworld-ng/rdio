import { Check, Search, Upload } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

export interface MediaSearchOption {
  id: string;
  name: string;
  type: "audio" | "image";
}

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
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return options;
    }

    return options.filter((option) =>
      option.name.toLowerCase().includes(normalized)
    );
  }, [options, query]);

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
        inputRef.current?.blur();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  let searchOptionsContent: ReactNode;
  if (options.length === 0) {
    searchOptionsContent = (
      <p className="media-search-empty">No media in the library yet.</p>
    );
  } else if (filteredOptions.length === 0) {
    searchOptionsContent = (
      <p className="media-search-empty">
        No matches for &ldquo;{query.trim()}&rdquo;
      </p>
    );
  } else {
    searchOptionsContent = filteredOptions.map((option) => {
      const isSelected = option.id === selectedId;

      return (
        <button
          aria-selected={isSelected}
          className={
            isSelected
              ? "media-search-option is-selected"
              : "media-search-option"
          }
          key={option.id}
          onClick={() => {
            onSelect(option.id);
            setQuery("");
            setIsOpen(false);
          }}
          role="option"
          type="button"
        >
          <span className="media-search-option-copy">
            <strong>{option.name}</strong>
            <em>{option.type}</em>
          </span>
          {isSelected ? (
            <Check aria-hidden="true" size={14} strokeWidth={2} />
          ) : null}
        </button>
      );
    });
  }

  return (
    <div className={`media-search${isOpen ? "is-open" : ""}`} ref={rootRef}>
      <label className="media-search-label">
        <span>Media</span>
        <div className="media-search-control">
          <Search
            aria-hidden="true"
            className="media-search-icon"
            size={15}
            strokeWidth={1.8}
          />
          <input
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-expanded={isOpen}
            disabled={disabled}
            onChange={(event) => {
              setQuery(event.target.value);
              setIsOpen(true);
            }}
            onFocus={() => {
              if (!disabled) {
                setIsOpen(true);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && filteredOptions.length > 0) {
                event.preventDefault();
                onSelect(filteredOptions[0].id);
                setQuery("");
                setIsOpen(false);
              }
            }}
            placeholder="Search library…"
            ref={inputRef}
            role="combobox"
            type="search"
            value={query}
          />
        </div>
      </label>
      {isOpen && !disabled ? (
        <div className="media-search-menu" id={listboxId} role="listbox">
          {searchOptionsContent}
          <button
            className="media-search-upload"
            onClick={onUploadClick}
            type="button"
          >
            <Upload aria-hidden="true" size={14} strokeWidth={1.8} />
            Upload new file
          </button>
        </div>
      ) : null}
    </div>
  );
}
