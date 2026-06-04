import { Settings, Trash2, UserPlus, X } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { useAppLayout, useCurrentStation } from "@/app";
import { StationSettings } from "@/components/pages/settings-page";
import { apiBaseUrl, apiFetch } from "@/lib/api";
import { useAuthenticatedUser } from "@/providers/auth-provider";

interface Member {
  email: string;
  id: string;
  mustChangePassword?: boolean;
  name: string;
  role?: string | null;
}

interface MembersResponse {
  users: Member[];
}

export function MembersRoutePage() {
  const { canViewMembers } = useAppLayout();
  const station = useCurrentStation();
  if (!canViewMembers) {
    return <StationSettings station={station} />;
  }

  return <MembersPage />;
}

export function MembersPage() {
  const currentUser = useAuthenticatedUser();
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [editingRoleMember, setEditingRoleMember] = useState<Member | null>(
    null
  );
  const [selectedRole, setSelectedRole] = useState("user");

  const loadMembers = useCallback(async () => {
    const response = await apiFetch(`${apiBaseUrl}/members`);
    if (!response.ok) {
      throw new Error("Could not load members.");
    }

    const data = (await response.json()) as MembersResponse;
    setMembers(data.users);
  }, []);

  useEffect(() => {
    loadMembers().catch((loadError: unknown) => {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load members."
      );
    });
  }, [loadMembers]);

  async function createMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setIsSubmitting(true);
    setError("");

    const response = await apiFetch(`${apiBaseUrl}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(data.get("name")),
        email: String(data.get("email")),
        password: String(data.get("password")),
      }),
    });

    setIsSubmitting(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        message?: string;
        error?: string;
      } | null;
      setError(body?.message ?? body?.error ?? "Could not create member.");
      return;
    }

    form.reset();
    await loadMembers();
  }

  async function deleteMember(id: string) {
    const response = await apiFetch(`${apiBaseUrl}/members/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setError("Could not delete member.");
      return;
    }

    await loadMembers();
  }

  async function updateRole(id: string, role: string) {
    const response = await apiFetch(`${apiBaseUrl}/members/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });

    if (!response.ok) {
      setError("Could not update role.");
      return;
    }

    await loadMembers();
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
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Creating..." : "Add member"}
        </button>
      </form>
      {error ? <p className="form-error">{error}</p> : null}
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
