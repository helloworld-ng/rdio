import { useQuery } from "@tanstack/react-query";
import { Plus, Settings, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { CreateMemberDialog } from "@/components/members/create-member-dialog";
import { EditMemberRoleDialog } from "@/components/members/edit-member-role-dialog";
import { SettingsPage } from "@/components/pages/settings-page";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import {
  membersQueryOptions,
  useCreateMember,
  useDeleteMember,
  useUpdateMemberRole,
} from "@/lib/queries/members";
import { useAuthenticatedUser } from "@/providers/auth-provider";
import type { Member } from "@/types/api";

export function MembersRoutePage() {
  const user = useAuthenticatedUser();
  const canViewMembers = user.role?.split(",").includes("admin") ?? false;

  if (!canViewMembers) {
    return <SettingsPage />;
  }

  return <MembersPage />;
}

export function MembersPage() {
  const currentUser = useAuthenticatedUser();
  const membersQuery = useQuery(membersQueryOptions());
  const createMemberMutation = useCreateMember();
  const deleteMemberMutation = useDeleteMember();
  const updateMemberRoleMutation = useUpdateMemberRole();
  const [error, setError] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [editingRoleMember, setEditingRoleMember] = useState<Member | null>(
    null
  );
  const members = membersQuery.data ?? [];
  const loadError =
    membersQuery.error instanceof Error ? membersQuery.error.message : "";

  async function updateRole(id: string, role: string) {
    try {
      await updateMemberRoleMutation.mutateAsync({ id, role });
    } catch {
      setError("Could not update role.");
      throw new Error("Could not update role.");
    }
  }

  const pendingDeleteMember = members.find((m) => m.id === pendingDeleteId);

  return (
    <section aria-label="Members" className="library-view members-view">
      <DeleteConfirmationDialog
        confirmLabel="Delete member"
        entityName={pendingDeleteMember?.name}
        onConfirm={async () => {
          if (!pendingDeleteMember) {
            return;
          }

          try {
            await deleteMemberMutation.mutateAsync(pendingDeleteMember.id);
          } catch {
            setError("Could not delete member.");
            throw new Error("Could not delete member.");
          }
        }}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteId(null);
          }
        }}
        open={Boolean(pendingDeleteId)}
        title="Delete member?"
      />
      <EditMemberRoleDialog
        member={editingRoleMember}
        onOpenChange={(open) => {
          if (!open) {
            setEditingRoleMember(null);
          }
        }}
        onSubmit={updateRole}
        open={Boolean(editingRoleMember)}
      />
      <div className="library-header">
        <div>
          <UserPlus aria-hidden="true" size={18} strokeWidth={1.8} />
          <strong>Members</strong>
        </div>
        <button onClick={() => setIsCreateModalOpen(true)} type="button">
          <Plus aria-hidden="true" size={15} strokeWidth={1.8} />
          New member
        </button>
      </div>
      <CreateMemberDialog
        onOpenChange={setIsCreateModalOpen}
        onSubmit={createMemberMutation.mutateAsync}
        open={isCreateModalOpen}
      />
      {error || loadError ? (
        <p className="form-error">{error || loadError}</p>
      ) : null}
      <div className="members-list divide-y divide-[#dfe8ea]">
        {members.map((member) => (
          <article className="member-row" key={member.id}>
            <div>
              <strong>{member.name}</strong>
              <span>{member.email}</span>
            </div>
            <div className="member-meta">
              <span>{member.role ?? "user"}</span>
              {member.mustChangePassword ? (
                <span>password change required</span>
              ) : null}
            </div>
            {member.id !== currentUser.id && member.role !== "admin" ? (
              <div className="library-actions">
                <button
                  aria-label={`Change role for ${member.name}`}
                  onClick={() => setEditingRoleMember(member)}
                  type="button"
                >
                  <Settings aria-hidden="true" size={14} strokeWidth={1.8} />
                </button>
                <button
                  aria-label={`Delete ${member.name}`}
                  onClick={() => setPendingDeleteId(member.id)}
                  type="button"
                >
                  <Trash2 aria-hidden="true" size={14} strokeWidth={1.8} />
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
