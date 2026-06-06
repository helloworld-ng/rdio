import { Button } from "@rdio/ui/components/button";
import { Input } from "@rdio/ui/components/input";
import { User } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useAuth, useAuthenticatedUser } from "@/providers/auth-provider";

export function ProfilePage() {
  const user = useAuthenticatedUser();
  const { refreshSession } = useAuth();
  const [name, setName] = useState(user.name);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const trimmedName = name.trim();
  const hasNameChanged = trimmedName !== user.name;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!trimmedName) {
      setError("Enter a display name.");
      return;
    }

    if (!hasNameChanged) {
      return;
    }

    setIsSubmitting(true);
    setError("");

    const result = await authClient.updateUser({ name: trimmedName });
    setIsSubmitting(false);

    if (result.error) {
      setError(result.error.message ?? "Could not update your profile.");
      return;
    }

    await refreshSession();
  }

  return (
    <section aria-label="Profile" className="library-view">
      <div className="library-header">
        <div>
          <User aria-hidden="true" size={18} strokeWidth={1.8} />
          <strong>Profile</strong>
        </div>
      </div>
      <form className="grid max-w-[520px] gap-4 px-1 pt-2" onSubmit={submit}>
        <label
          className="grid gap-1.5 font-bold text-[#657278] text-[12px]"
          htmlFor="profile-name"
        >
          Name
          <Input
            autoComplete="name"
            className="h-11 rounded-md border-[#d6e0e3] bg-white px-3 text-[#30363a] focus-visible:border-[#a8d8e6] focus-visible:ring-[#1598ca]/15"
            id="profile-name"
            name="name"
            onChange={(event) => {
              setName(event.currentTarget.value);
              setError("");
            }}
            required
            value={name}
          />
        </label>
        <label
          className="grid gap-1.5 font-bold text-[#657278] text-[12px]"
          htmlFor="profile-email"
        >
          Email
          <Input
            className="h-11 rounded-md border-[#d6e0e3] bg-[#f5f8f9] px-3 text-[#7c8b90] disabled:opacity-100"
            disabled
            id="profile-email"
            type="email"
            value={user.email}
          />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <div className="flex justify-end pt-1">
          <Button
            className="primary-action"
            disabled={isSubmitting || !hasNameChanged}
            type="submit"
            variant="rdio-primary"
          >
            {isSubmitting ? "Saving..." : "Save profile"}
          </Button>
        </div>
      </form>
    </section>
  );
}
