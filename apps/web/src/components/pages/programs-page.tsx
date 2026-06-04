import { useQuery } from "@tanstack/react-query";
import { BookOpen, Plus, Settings, Trash2 } from "lucide-react";
import { useState } from "react";
import { HostAvatar } from "@/components/HostAvatar";
import { ProgramDialog } from "@/components/programs/program-dialog";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { hostsQueryOptions, useCreateHost } from "@/lib/queries/hosts";
import {
  programsQueryOptions,
  useCreateProgram,
  useDeleteProgram,
  useUpdateProgram,
} from "@/lib/queries/programs";
import type { HostRecord } from "@/types/host";
import type { Program } from "@/types/station";
import { addHostByName, findHost, getHostNames } from "@/utils/hosts";

interface ProgramsPageProps {
  hosts: HostRecord[];
  onAddHost: (hostName: string) => Promise<void>;
  onCreateProgram: (program: Omit<Program, "id">) => Promise<void>;
  onDeleteProgram: (programId: string) => Promise<void>;
  onUpdateProgram: (
    programId: string,
    program: Omit<Program, "id">
  ) => Promise<void>;
  programs: Program[];
}

export function ProgramsPage() {
  const hostsQuery = useQuery(hostsQueryOptions());
  const programsQuery = useQuery(programsQueryOptions());
  const createHostMutation = useCreateHost();
  const createProgramMutation = useCreateProgram();
  const updateProgramMutation = useUpdateProgram();
  const deleteProgramMutation = useDeleteProgram();
  const hosts = hostsQuery.data ?? [];
  const createHostByName = async (hostName: string) => {
    const host = addHostByName(hosts, hostName).at(hosts.length);
    if (!host) {
      return;
    }

    await createHostMutation.mutateAsync(host);
  };

  return (
    <ProgramsView
      hosts={hosts}
      onAddHost={createHostByName}
      onCreateProgram={(program) =>
        createProgramMutation.mutateAsync(program).then(() => undefined)
      }
      onDeleteProgram={(programId) =>
        deleteProgramMutation.mutateAsync(programId).then(() => undefined)
      }
      onUpdateProgram={(programId, program) =>
        updateProgramMutation
          .mutateAsync({ program, programId })
          .then(() => undefined)
      }
      programs={programsQuery.data ?? []}
    />
  );
}

function ProgramsView({
  hosts,
  programs,
  onAddHost,
  onCreateProgram,
  onUpdateProgram,
  onDeleteProgram,
}: ProgramsPageProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [pendingDeleteProgram, setPendingDeleteProgram] =
    useState<Program | null>(null);
  const hostNames = getHostNames(hosts);

  const openCreateModal = () => {
    setEditingProgram(null);
    setIsModalOpen(true);
  };

  const openEditModal = (program: Program) => {
    setEditingProgram(program);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProgram(null);
  };

  return (
    <section aria-label="Programs" className="library-view">
      <div className="library-header">
        <div>
          <BookOpen aria-hidden="true" size={18} strokeWidth={1.8} />
          <strong>Programs</strong>
        </div>
        <button onClick={openCreateModal} type="button">
          <Plus aria-hidden="true" size={15} strokeWidth={1.8} />
          New program
        </button>
      </div>
      <ProgramDialog
        hostNames={hostNames}
        mode={editingProgram ? "edit" : "create"}
        onAddHost={onAddHost}
        onOpenChange={(open) => {
          if (open) {
            setIsModalOpen(true);
            return;
          }

          closeModal();
        }}
        onSubmit={(programInput) =>
          editingProgram
            ? onUpdateProgram(editingProgram.id, programInput)
            : onCreateProgram(programInput)
        }
        open={isModalOpen}
        program={editingProgram}
      />
      <DeleteConfirmationDialog
        confirmLabel="Delete program"
        entityName={pendingDeleteProgram?.title}
        onConfirm={async () => {
          if (!pendingDeleteProgram) {
            return;
          }

          await onDeleteProgram(pendingDeleteProgram.id);
        }}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteProgram(null);
          }
        }}
        open={Boolean(pendingDeleteProgram)}
        title="Delete program?"
      />
      <div className="library-list">
        {programs.map((program) => {
          const hostRecord = findHost(hosts, program.host);

          return (
            <article className="library-row program-row" key={program.id}>
              <div className="program-row-body">
                <HostAvatar
                  colorId={hostRecord?.colorId}
                  name={program.host}
                  title={program.host}
                />
                <div className="program-row-copy">
                  <strong>{program.title}</strong>
                  <p className="program-row-meta">
                    <span className="program-row-host">{program.host}</span>
                    {program.description ? (
                      <>
                        <span
                          aria-hidden="true"
                          className="program-row-meta-sep"
                        >
                          ·
                        </span>
                        <span className="program-row-description">
                          {program.description}
                        </span>
                      </>
                    ) : null}
                  </p>
                </div>
              </div>
              <div className="library-actions">
                <button
                  aria-label={`Edit ${program.title}`}
                  onClick={() => openEditModal(program)}
                  type="button"
                >
                  <Settings aria-hidden="true" size={14} strokeWidth={1.8} />
                </button>
                <button
                  aria-label={`Delete ${program.title}`}
                  onClick={() => setPendingDeleteProgram(program)}
                  type="button"
                >
                  <Trash2 aria-hidden="true" size={14} strokeWidth={1.8} />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
