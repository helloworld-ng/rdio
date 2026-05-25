import type { CSSProperties } from 'react'

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)

  if (parts.length === 0) {
    return '?'
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export const hostPalette = [
  { id: 'cyan', label: 'Cyan', background: '#dff3fa', foreground: '#116f93' },
  { id: 'green', label: 'Green', background: '#e1f3ef', foreground: '#287765' },
  { id: 'gold', label: 'Gold', background: '#f7edcf', foreground: '#84641c' },
  { id: 'rose', label: 'Rose', background: '#f8e4ea', foreground: '#93435d' },
  { id: 'violet', label: 'Violet', background: '#ece7f8', foreground: '#68539b' },
  { id: 'gray', label: 'Gray', background: '#e9eef0', foreground: '#526166' },
] as const

export type HostColorId = (typeof hostPalette)[number]['id']

export function getHostPaletteColor(colorId: string | undefined) {
  return hostPalette.find((color) => color.id === colorId) ?? hostPalette[0]
}

export function HostAvatar({
  className,
  colorId,
  name,
  title,
}: {
  className?: string
  colorId?: string
  name: string
  title?: string
}) {
  const classes = ['host-avatar', className].filter(Boolean).join(' ')
  const color = getHostPaletteColor(colorId)

  return (
    <span
      aria-hidden="true"
      className={classes}
      style={
        {
          '--host-avatar-bg': color.background,
          '--host-avatar-fg': color.foreground,
        } as CSSProperties
      }
      title={title ?? name}
    >
      {getInitials(name)}
    </span>
  )
}
