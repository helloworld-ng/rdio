import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

export function UserAccountMenu({ firstName, onLogout }: { firstName: string; onLogout: () => void }) {
  const menuId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)

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
    <div className="user-account-menu" ref={rootRef}>
      <button
        className="user-account-trigger"
        type="button"
        aria-controls={menuId}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={() => setIsOpen((open) => !open)}
      >
        <span>{firstName}</span>
        <ChevronDown aria-hidden="true" size={14} strokeWidth={1.8} />
      </button>
      {isOpen ? (
        <div className="user-account-dropdown" id={menuId} role="menu">
          <button
            className="user-account-dropdown-item"
            role="menuitem"
            type="button"
            onClick={() => {
              setIsOpen(false)
              onLogout()
            }}
          >
            Log out
          </button>
        </div>
      ) : null}
    </div>
  )
}
