import { useEffect, useId, useRef, useState } from 'react'
import { getHostPaletteColor, hostPalette, type HostColorId } from './HostAvatar'

export function HostColorPicker({
  colorId,
  onChange,
}: {
  colorId?: string
  onChange: (colorId: HostColorId) => void
}) {
  const color = getHostPaletteColor(colorId)
  const rootRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const listId = useId()

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

  return (
    <div className={['host-color-picker', isOpen ? 'is-open' : ''].filter(Boolean).join(' ')} ref={rootRef}>
      <button
        aria-controls={listId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`Host color: ${color.label}. Choose color`}
        className="host-color-dot"
        style={{ background: color.background }}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
      />
      {isOpen ? (
        <div aria-label="Host colors" className="host-color-picker-menu" id={listId} role="listbox">
          {hostPalette.map((option) => (
            <button
              aria-selected={colorId === option.id}
              className={colorId === option.id ? 'is-selected' : ''}
              key={option.id}
              role="option"
              style={{ background: option.background }}
              title={option.label}
              type="button"
              onClick={() => {
                onChange(option.id)
                setIsOpen(false)
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
