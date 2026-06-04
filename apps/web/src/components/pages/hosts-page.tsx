import { useQuery } from "@tanstack/react-query";
import { Plus, Settings, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { HostColorPicker } from "@/components/HostColorPill";
import { HostDialog } from "@/components/hosts/host-dialog";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import {
  hostsQueryOptions,
  useCreateHost,
  useDeleteHost,
  useUpdateHost,
} from "@/lib/queries/hosts";
import type { HostRecord } from "@/types/host";

interface HostsPageProps {
  hosts: HostRecord[];
  onAddHost: (host: HostRecord) => Promise<void>;
  onRemoveHost: (host: string) => Promise<void>;
  onUpdateHost: (hostName: string, host: HostRecord) => Promise<void>;
}

export function HostsRoutePage() {
  const hostsQuery = useQuery(hostsQueryOptions());
  const createHostMutation = useCreateHost();
  const updateHostMutation = useUpdateHost();
  const deleteHostMutation = useDeleteHost();

  return (
    <HostsPage
      hosts={hostsQuery.data ?? []}
      onAddHost={(host) =>
        createHostMutation.mutateAsync(host).then(() => undefined)
      }
      onRemoveHost={(hostName) => deleteHostMutation.mutateAsync(hostName)}
      onUpdateHost={(hostName, host) =>
        updateHostMutation.mutateAsync({ host, hostName }).then(() => undefined)
      }
    />
  );
}

export function HostsPage({
  hosts,
  onAddHost,
  onRemoveHost,
  onUpdateHost,
}: HostsPageProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHost, setEditingHost] = useState<HostRecord | null>(null);
  const [pendingDeleteHost, setPendingDeleteHost] = useState<HostRecord | null>(
    null
  );

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingHost(null);
  };

  const openCreateModal = () => {
    setEditingHost(null);
    setIsModalOpen(true);
  };

  const openEditModal = (host: HostRecord) => {
    setEditingHost(host);
    setIsModalOpen(true);
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
      <HostDialog
        host={editingHost}
        hosts={hosts}
        onOpenChange={(open) => {
          if (open) {
            setIsModalOpen(true);
            return;
          }

          closeModal();
        }}
        onSubmit={(host) =>
          editingHost ? onUpdateHost(editingHost.name, host) : onAddHost(host)
        }
        open={isModalOpen}
      />
      <DeleteConfirmationDialog
        confirmLabel="Delete host"
        entityName={pendingDeleteHost?.name}
        onConfirm={async () => {
          if (!pendingDeleteHost) {
            return;
          }

          await onRemoveHost(pendingDeleteHost.name);
        }}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteHost(null);
          }
        }}
        open={Boolean(pendingDeleteHost)}
        title="Delete host?"
      />
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
                onClick={() => setPendingDeleteHost(host)}
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
