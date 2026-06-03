import { UserPlus } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { apiBaseUrl, apiFetch } from "../lib/api";

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

export function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  return (
    <section aria-label="Members" className="library-view members-view">
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
          </article>
        ))}
      </div>
    </section>
  );
}
