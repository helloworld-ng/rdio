import React, { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown, X } from 'lucide-react'

interface MultiSelectProps {
  options: string[]
  value: string[]
  onChange: (value: string[]) => void
  disabled?: boolean
  placeholder?: string
  multiple?: boolean
  label?: string
  onCreateOption?: (value: string) => void
  createPlaceholder?: string
}

export function MultiSelect({
  options,
  value,
  onChange,
  disabled = false,
  placeholder = 'Select…',
  multiple = true,
  label,
  onCreateOption,
  createPlaceholder = 'Add new…',
}: MultiSelectProps) {
  const listboxId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [createValue, setCreateValue] = useState('')

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const toggleOption = (option: string) => {
    if (disabled) {
      return
    }

    if (multiple) {
      onChange(value.includes(option) ? value.filter((item) => item !== option) : [...value, option])
      return
    }

    onChange(value.includes(option) ? [] : [option])
    setIsOpen(false)
  }

  const removeValue = (option: string) => {
    if (disabled) {
      return
    }

    onChange(value.filter((item) => item !== option))
  }

  const createOption = () => {
    const normalized = createValue.trim()

    if (!normalized || !onCreateOption) {
      return
    }

    onCreateOption(normalized)

    if (multiple) {
      onChange(value.includes(normalized) ? value : [...value, normalized])
    } else {
      onChange([normalized])
      setIsOpen(false)
    }

    setCreateValue('')
  }

  const control = (
    <div className={`multi-select${isOpen ? ' is-open' : ''}`} ref={rootRef}>
      <button
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="multi-select-trigger"
        disabled={disabled}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="multi-select-values">
          {value.length === 0 ? (
            <span className="multi-select-placeholder">{placeholder}</span>
          ) : (
            value.map((item) => (
              <span className="multi-select-chip" key={item}>
                {item}
                {multiple && !disabled ? (
                  <span
                    aria-label={`Remove ${item}`}
                    className="multi-select-chip-remove"
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      event.stopPropagation()
                      removeValue(item)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        event.stopPropagation()
                        removeValue(item)
                      }
                    }}
                  >
                    <X aria-hidden="true" size={12} strokeWidth={2} />
                  </span>
                ) : null}
              </span>
            ))
          )}
        </span>
        <ChevronDown aria-hidden="true" className="multi-select-chevron" size={16} strokeWidth={1.8} />
      </button>
      {isOpen && !disabled ? (
        <div className="multi-select-menu" id={listboxId} role="listbox">
          {options.length === 0 ? <p className="multi-select-empty">No options yet</p> : null}
          {options.map((option) => {
            const isSelected = value.includes(option)

            return (
              <button
                aria-selected={isSelected}
                className={isSelected ? 'multi-select-option is-selected' : 'multi-select-option'}
                key={option}
                role="option"
                type="button"
                onClick={() => toggleOption(option)}
              >
                <span>{option}</span>
                {isSelected ? <Check aria-hidden="true" size={14} strokeWidth={2} /> : null}
              </button>
            )
          })}
          {onCreateOption ? (
            <div className="multi-select-create">
              <input
                placeholder={createPlaceholder}
                value={createValue}
                onChange={(event) => setCreateValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    createOption()
                  }
                }}
              />
              <button disabled={!createValue.trim()} type="button" onClick={createOption}>
                Add
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )

  if (!label) {
    return control
  }

  return (
    <label className="multi-select-field">
      <span>{label}</span>
      {control}
    </label>
  )
}
