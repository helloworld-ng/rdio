import { useQuery } from "@tanstack/react-query";
import { BookOpen, Plus, Settings, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { HostAvatar } from "@/components/HostAvatar";
import { MultiSelect } from "@/components/MultiSelect";
import { Modal } from "@/components/ui/modal";
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
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const hostNames = getHostNames(hosts);
  const [host, setHost] = useState<string[]>(
    hostNames[0] ? [hostNames[0]] : []
  );

  const openCreateModal = () => {
    setEditingProgramId(null);
    setTitle("");
    setDescription("");
    setHost(hostNames[0] ? [hostNames[0]] : []);
    setIsModalOpen(true);
  };

  const openEditModal = (program: Program) => {
    setEditingProgramId(program.id);
    setTitle(program.title);
    setDescription(program.description);
    setHost([program.host]);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProgramId(null);
    setTitle("");
    setDescription("");
    setHost(hostNames[0] ? [hostNames[0]] : []);
  };

  useEffect(() => {
    if (isModalOpen || host.length > 0) {
      return;
    }

    if (hostNames[0]) {
      setHost([hostNames[0]]);
    }
  }, [host.length, hostNames, isModalOpen]);

  const saveProgram = () => {
    const normalizedTitle = title.trim();
    const normalizedDescription = description.trim();
    const selectedHost = host[0]?.trim();

    if (!(normalizedTitle && selectedHost)) {
      return;
    }

    const programInput = {
      title: normalizedTitle,
      description: normalizedDescription,
      host: selectedHost,
    };

    if (editingProgramId) {
      onUpdateProgram(editingProgramId, programInput);
    } else {
      onCreateProgram(programInput);
    }

    closeModal();
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
      {isModalOpen ? (
        <Modal
          onClose={closeModal}
          title={editingProgramId ? "Edit program" : "New program"}
        >
          <form
            className="program-create-form"
            onSubmit={(event) => {
              event.preventDefault();
              saveProgram();
            }}
          >
            <label>
              <span>Program</span>
              <input
                onChange={(event) => setTitle(event.target.value)}
                value={title}
              />
            </label>
            <label>
              <span>Description</span>
              <textarea
                onChange={(event) => setDescription(event.target.value)}
                value={description}
              />
            </label>
            <MultiSelect
              createPlaceholder="New host name"
              label="Host"
              multiple={false}
              onChange={setHost}
              onCreateOption={onAddHost}
              options={hostNames}
              placeholder="Select host"
              value={host}
            />
            <div className="form-actions">
              <button className="primary-action" type="submit">
                {editingProgramId ? "Update program" : "Save program"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
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
                  onClick={() => onDeleteProgram(program.id)}
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
