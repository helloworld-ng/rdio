import { useQuery } from "@tanstack/react-query";
import { Settings, Trash2, UserPlus, X } from "lucide-react";
import { type FormEvent, useState } from "react";
import { SettingsPage } from "@/components/pages/settings-page";
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
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [editingRoleMember, setEditingRoleMember] = useState<Member | null>(
    null
  );
  const [selectedRole, setSelectedRole] = useState("user");
  const members = membersQuery.data ?? [];
  const loadError =
    membersQuery.error instanceof Error ? membersQuery.error.message : "";

  async function createMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setError("");

    try {
      await createMemberMutation.mutateAsync({
        name: String(data.get("name")),
        email: String(data.get("email")),
        password: String(data.get("password")),
      });
      form.reset();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Could not create member."
      );
    }
  }

  async function deleteMember(id: string) {
    try {
      await deleteMemberMutation.mutateAsync(id);
    } catch {
      setError("Could not delete member.");
    }
  }

  async function updateRole(id: string, role: string) {
    try {
      await updateMemberRoleMutation.mutateAsync({ id, role });
    } catch {
      setError("Could not update role.");
    }
  }

  const pendingDeleteMember = members.find((m) => m.id === pendingDeleteId);

  return (
    <section aria-label="Members" className="library-view members-view">
      {pendingDeleteId ? (
        <div className="modal-backdrop">
          <button
            aria-label="Close dialog"
            className="modal-backdrop-close"
            onClick={() => setPendingDeleteId(null)}
            type="button"
          />
          <section
            aria-label="Delete member"
            aria-modal="true"
            className="modal-panel"
            role="dialog"
          >
            <div className="modal-header">
              <strong>Delete member?</strong>
              <button
                aria-label="Close modal"
                onClick={() => setPendingDeleteId(null)}
                type="button"
              >
                <X aria-hidden="true" size={15} strokeWidth={1.8} />
              </button>
            </div>
            <div className="confirm-dialog">
              <p>
                Permanently delete <strong>{pendingDeleteMember?.name}</strong>?
                This cannot be undone.
              </p>
              <div className="form-actions">
                <button onClick={() => setPendingDeleteId(null)} type="button">
                  Cancel
                </button>
                <button
                  className="primary-action"
                  onClick={() => {
                    const id = pendingDeleteId;
                    setPendingDeleteId(null);
                    deleteMember(id).catch(() => undefined);
                  }}
                  type="button"
                >
                  Delete member
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
      {editingRoleMember ? (
        <div className="modal-backdrop">
          <button
            aria-label="Close dialog"
            className="modal-backdrop-close"
            onClick={() => setEditingRoleMember(null)}
            type="button"
          />
          <section
            aria-label="Change role"
            aria-modal="true"
            className="modal-panel"
            role="dialog"
          >
            <div className="modal-header">
              <strong>Change role</strong>
              <button
                aria-label="Close modal"
                onClick={() => setEditingRoleMember(null)}
                type="button"
              >
                <X aria-hidden="true" size={15} strokeWidth={1.8} />
              </button>
            </div>
            <form
              className="host-create-form"
              onSubmit={(event) => {
                event.preventDefault();
                const member = editingRoleMember;
                setEditingRoleMember(null);
                updateRole(member.id, selectedRole).catch(() => undefined);
              }}
            >
              <label>
                <span>Role for {editingRoleMember.name}</span>
                <select
                  onChange={(e) => setSelectedRole(e.target.value)}
                  value={selectedRole}
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              </label>
              <div className="form-actions">
                <button className="primary-action" type="submit">
                  Save role
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
      <div className="library-header">
        <div>
          <UserPlus aria-hidden="true" size={18} strokeWidth={1.8} />
          <strong>Members</strong>
        </div>
      </div>
      <form className="member-create-form" onSubmit={createMember}>
        <label>
          Name
          <input autoComplete="name" name="name" required />
        </label>
        <label>
          Email
          <input autoComplete="email" name="email" required type="email" />
        </label>
        <label>
          Temporary password
          <input
            autoComplete="new-password"
            minLength={8}
            name="password"
            required
            type="password"
          />
        </label>
        <button
          className="primary-action"
          disabled={createMemberMutation.isPending}
          type="submit"
        >
          {createMemberMutation.isPending ? "Creating..." : "Add member"}
        </button>
      </form>
      {error || loadError ? (
        <p className="form-error">{error || loadError}</p>
      ) : null}
      <div className="members-list">
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
                  onClick={() => {
                    setSelectedRole(member.role ?? "user");
                    setEditingRoleMember(member);
                  }}
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
