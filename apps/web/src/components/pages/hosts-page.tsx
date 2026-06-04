import { Plus, Settings, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { useAppLayout } from "@/app";
import { type HostColorId, hostPalette } from "@/components/HostAvatar";
import { HostColorPicker } from "@/components/HostColorPill";
import { Modal } from "@/components/ui/modal";
import type { HostRecord } from "@/types/host";

interface HostsPageProps {
  hosts: HostRecord[];
  onAddHost: (host: HostRecord) => Promise<void>;
  onRemoveHost: (host: string) => Promise<void>;
  onUpdateHost: (hostName: string, host: HostRecord) => Promise<void>;
}

export function HostsRoutePage() {
  const { hostsPage } = useAppLayout();

  return <HostsPage {...hostsPage} />;
}

export function HostsPage({
  hosts,
  onAddHost,
  onRemoveHost,
  onUpdateHost,
}: HostsPageProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHostName, setEditingHostName] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [colorId, setColorId] = useState<HostColorId | string>(
    hostPalette[0].id
  );

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingHostName(null);
    setName("");
    setColorId(hostPalette[0].id);
  };

  const openCreateModal = () => {
    setEditingHostName(null);
    setName("");
    setColorId(hostPalette[0].id);
    setIsModalOpen(true);
  };

  const openEditModal = (host: HostRecord) => {
    setEditingHostName(host.name);
    setName(host.name);
    setColorId(host.colorId);
    setIsModalOpen(true);
  };

  const saveHost = () => {
    const normalized = name.trim();
    const isDuplicate = hosts.some(
      (host) => host.name === normalized && host.name !== editingHostName
    );

    if (!normalized || isDuplicate) {
      return;
    }

    if (editingHostName) {
      onUpdateHost(editingHostName, { name: normalized, colorId });
    } else {
      onAddHost({ name: normalized, colorId });
    }

    closeModal();
  };

  return (
    <section aria-label="Hosts" className="library-view">
      <div className="library-header">
        <div>
          <Users aria-hidden="true" size={18} strokeWidth={1.8} />
          <strong>Hosts</strong>
        </div>
        <button onClick={openCreateModal} type="button">
          <Plus aria-hidden="true" size={15} strokeWidth={1.8} />
          New host
        </button>
      </div>
      {isModalOpen ? (
        <Modal
          onClose={closeModal}
          title={editingHostName ? "Edit host" : "New host"}
        >
          <form
            className="host-create-form"
            onSubmit={(event) => {
              event.preventDefault();
              saveHost();
            }}
          >
            <label>
              <span>Host name</span>
              <input
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Maya Stone"
                value={name}
              />
            </label>
            <fieldset className="host-color-field">
              <legend>Color</legend>
              <div className="host-color-options">
                {hostPalette.map((color) => (
                  <label
                    className={colorId === color.id ? "is-selected" : ""}
                    key={color.id}
                    title={color.label}
                  >
                    <input
                      checked={colorId === color.id}
                      name="host-color"
                      onChange={() => setColorId(color.id)}
                      type="radio"
                      value={color.id}
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
                {editingHostName ? "Update host" : "Add host"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
      <div className="library-list">
        {hosts.length === 0 ? (
          <p className="library-empty">No hosts yet</p>
        ) : null}
        {hosts.map((host) => (
          <article className="library-row host-row" key={host.name}>
            <div className="host-row-body">
              <div className="host-row-title">
                <HostColorPicker
                  colorId={host.colorId}
                  onChange={(nextColorId) =>
                    onUpdateHost(host.name, {
                      name: host.name,
                      colorId: nextColorId,
                    })
                  }
                />
                <span className="host-row-name">{host.name}</span>
              </div>
            </div>
            <div className="library-actions">
              <button
                aria-label={`Edit ${host.name}`}
                onClick={() => openEditModal(host)}
                type="button"
              >
                <Settings aria-hidden="true" size={14} strokeWidth={1.8} />
              </button>
              <button
                aria-label={`Remove ${host.name}`}
                onClick={() => onRemoveHost(host.name)}
                type="button"
              >
                <Trash2 aria-hidden="true" size={14} strokeWidth={1.8} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
