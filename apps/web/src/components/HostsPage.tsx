import React, { useState } from 'react'
import { Plus, Settings, Trash2, Users, X } from 'lucide-react'
import { hostPalette, type HostColorId } from './HostAvatar'
import { HostColorPicker } from './HostColorPill'

export interface HostRecord {
  name: string
  colorId: HostColorId | string
}

interface HostsPageProps {
  hosts: HostRecord[]
  onAddHost: (host: HostRecord) => void
  onRemoveHost: (host: string) => void
  onUpdateHost: (hostName: string, host: HostRecord) => void
}

export function HostsPage({ hosts, onAddHost, onRemoveHost, onUpdateHost }: HostsPageProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingHostName, setEditingHostName] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [colorId, setColorId] = useState<HostColorId | string>(hostPalette[0].id)

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingHostName(null)
    setName('')
    setColorId(hostPalette[0].id)
  }

  const openCreateModal = () => {
    setEditingHostName(null)
    setName('')
    setColorId(hostPalette[0].id)
    setIsModalOpen(true)
  }

  const openEditModal = (host: HostRecord) => {
    setEditingHostName(host.name)
    setName(host.name)
    setColorId(host.colorId)
    setIsModalOpen(true)
  }

  const saveHost = () => {
    const normalized = name.trim()
    const isDuplicate = hosts.some((host) => host.name === normalized && host.name !== editingHostName)

    if (!normalized || isDuplicate) {
      return
    }

    if (editingHostName) {
      onUpdateHost(editingHostName, { name: normalized, colorId })
    } else {
      onAddHost({ name: normalized, colorId })
    }

    closeModal()
  }

  return (
    <section className="library-view" aria-label="Hosts">
      <div className="library-header">
        <div>
          <Users aria-hidden="true" size={18} strokeWidth={1.8} />
          <strong>Hosts</strong>
        </div>
        <button type="button" onClick={openCreateModal}>
          <Plus aria-hidden="true" size={15} strokeWidth={1.8} />
          New host
        </button>
      </div>
      {isModalOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={closeModal}>
          <section
            aria-label={editingHostName ? 'Edit host' : 'New host'}
            aria-modal="true"
            className="modal-panel"
            role="dialog"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <strong>{editingHostName ? 'Edit host' : 'New host'}</strong>
              <button type="button" onClick={closeModal} aria-label="Close modal">
                <X aria-hidden="true" size={15} strokeWidth={1.8} />
              </button>
            </div>
            <form
              className="host-create-form"
              onSubmit={(event) => {
                event.preventDefault()
                saveHost()
              }}
            >
              <label>
                <span>Host name</span>
                <input placeholder="e.g. Maya Stone" value={name} onChange={(event) => setName(event.target.value)} />
              </label>
              <fieldset className="host-color-field">
                <legend>Color</legend>
                <div className="host-color-options">
                  {hostPalette.map((color) => (
                    <label
                      className={colorId === color.id ? 'is-selected' : ''}
                      key={color.id}
                      title={color.label}
                    >
                      <input
                        checked={colorId === color.id}
                        name="host-color"
                        type="radio"
                        value={color.id}
                        onChange={() => setColorId(color.id)}
                      />
                      <span
                        style={{
                          background: color.background,
                          color: color.foreground,
                        }}
                      >
                        {color.label}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="form-actions">
                <button className="primary-action" type="submit">
                  {editingHostName ? 'Update host' : 'Add host'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
      <div className="library-list">
        {hosts.length === 0 ? <p className="library-empty">No hosts yet</p> : null}
        {hosts.map((host) => (
          <article className="library-row host-row" key={host.name}>
            <div className="host-row-body">
              <div className="host-row-title">
                <HostColorPicker
                  colorId={host.colorId}
                  onChange={(nextColorId) => onUpdateHost(host.name, { name: host.name, colorId: nextColorId })}
                />
                <span className="host-row-name">{host.name}</span>
              </div>
            </div>
            <div className="library-actions">
              <button aria-label={`Edit ${host.name}`} type="button" onClick={() => openEditModal(host)}>
                <Settings aria-hidden="true" size={14} strokeWidth={1.8} />
              </button>
              <button aria-label={`Remove ${host.name}`} type="button" onClick={() => onRemoveHost(host.name)}>
                <Trash2 aria-hidden="true" size={14} strokeWidth={1.8} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
