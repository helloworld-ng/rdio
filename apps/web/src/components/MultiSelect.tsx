import { Check, ChevronDown, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface MultiSelectProps {
  createPlaceholder?: string;
  disabled?: boolean;
  label?: string;
  multiple?: boolean;
  onChange: (value: string[]) => void;
  onCreateOption?: (value: string) => void;
  options: string[];
  placeholder?: string;
  value: string[];
}

export function MultiSelect({
  options,
  value,
  onChange,
  disabled = false,
  placeholder = "Select…",
  multiple = true,
  label,
  onCreateOption,
  createPlaceholder = "Add new…",
}: MultiSelectProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [createValue, setCreateValue] = useState("");
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const updatePosition = () => {
      const root = rootRef.current;
      if (!root) {
        return;
      }
      const rect = root.getBoundingClientRect();
      setMenuStyle({
        position: "fixed",
        top: rect.bottom + 4,
        left: rect.left,
        right: "auto",
        width: rect.width,
      });
    };

    updatePosition();

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !(
          rootRef.current?.contains(target) || menuRef.current?.contains(target)
        )
      ) {
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
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen]);

  const toggleOption = (option: string) => {
    if (disabled) {
      return;
    }

    if (multiple) {
      onChange(
        value.includes(option)
          ? value.filter((item) => item !== option)
          : [...value, option]
      );
      return;
    }

    onChange(value.includes(option) ? [] : [option]);
    setIsOpen(false);
  };

  const removeValue = (option: string) => {
    if (disabled) {
      return;
    }

    onChange(value.filter((item) => item !== option));
  };

  const createOption = () => {
    const normalized = createValue.trim();

    if (!(normalized && onCreateOption)) {
      return;
    }

    onCreateOption(normalized);

    if (multiple) {
      onChange(value.includes(normalized) ? value : [...value, normalized]);
    } else {
      onChange([normalized]);
      setIsOpen(false);
    }

    setCreateValue("");
  };

  const menu =
    isOpen && !disabled
      ? createPortal(
          <div
            className="multi-select-menu"
            id={listboxId}
            ref={menuRef}
            role="listbox"
            style={menuStyle}
          >
            {options.length === 0 ? (
              <p className="multi-select-empty">No options yet</p>
            ) : null}
            {options.map((option) => {
              const isSelected = value.includes(option);

              return (
                <button
                  aria-selected={isSelected}
                  className={
                    isSelected
                      ? "multi-select-option is-selected"
                      : "multi-select-option"
                  }
                  key={option}
                  onClick={() => toggleOption(option)}
                  role="option"
                  type="button"
                >
                  <span>{option}</span>
                  {isSelected ? (
                    <Check aria-hidden="true" size={14} strokeWidth={2} />
                  ) : null}
                </button>
              );
            })}
            {onCreateOption ? (
              <div className="multi-select-create">
                <input
                  onChange={(event) => setCreateValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      createOption();
                    }
                  }}
                  placeholder={createPlaceholder}
                  value={createValue}
                />
                <button
                  disabled={!createValue.trim()}
                  onClick={createOption}
                  type="button"
                >
                  Add
                </button>
              </div>
            ) : null}
          </div>,
          document.body
        )
      : null;

  const control = (
    <div
      className={["multi-select", isOpen ? "is-open" : ""]
        .filter(Boolean)
        .join(" ")}
      ref={rootRef}
    >
      <button
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="multi-select-trigger"
        disabled={disabled}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span className="multi-select-values">
          {value.length === 0 ? (
            <span className="multi-select-placeholder">{placeholder}</span>
          ) : (
            value.map((item) => (
              <span className="multi-select-chip" key={item}>
                {item}
                {multiple && !disabled ? (
                  <button
                    aria-label={`Remove ${item}`}
                    className="multi-select-chip-remove"
                    onClick={(event) => {
                      event.stopPropagation();
                      removeValue(item);
                    }}
                    type="button"
                  >
                    <X aria-hidden="true" size={12} strokeWidth={2} />
                  </button>
                ) : null}
              </span>
            ))
          )}
        </span>
        <ChevronDown
          aria-hidden="true"
          className="multi-select-chevron"
          size={16}
          strokeWidth={1.8}
        />
      </button>
      {menu}
    </div>
  );

  if (!label) {
    return control;
  }

  return (
    <div className="multi-select-field">
      <span>{label}</span>
      {control}
    </div>
  );
}
