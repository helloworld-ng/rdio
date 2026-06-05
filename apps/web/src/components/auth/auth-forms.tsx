import { Input } from "@rdio/ui/components/input";
import { type FormEvent, type PropsWithChildren, useState } from "react";
import { PasswordInput } from "@/components/auth/password-input";
import { apiFetch } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

interface AuthFormProps {
  onComplete: () => void;
}

export function SetupForm({ onComplete }: AuthFormProps) {
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    const confirmPassword = String(form.get("confirmPassword"));

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    const result = await authClient.signUp.email({
      name: String(form.get("name")),
      email: String(form.get("email")),
      password,
    });

    setIsSubmitting(false);
    if (result.error) {
      setError(result.error.message ?? "Could not create administrator.");
      return;
    }

    onComplete();
  }

  return (
    <AuthForm
      error={error}
      isSubmitting={isSubmitting}
      onSubmit={submit}
      submitLabel="Create administrator"
    >
      <label htmlFor="setup-name">
        Name
        <Input autoComplete="name" id="setup-name" name="name" required />
      </label>
      <label htmlFor="setup-email">
        Email
        <Input
          autoComplete="email"
          id="setup-email"
          name="email"
          required
          type="email"
        />
      </label>
      <label htmlFor="setup-password">
        Password
        <PasswordInput
          autoComplete="new-password"
          id="setup-password"
          minLength={8}
          name="password"
          required
        />
      </label>
      <label htmlFor="setup-confirm-password">
        Confirm password
        <PasswordInput
          autoComplete="new-password"
          id="setup-confirm-password"
          minLength={8}
          name="confirmPassword"
          required
        />
      </label>
    </AuthForm>
  );
}

export function LoginForm({ onComplete }: AuthFormProps) {
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setIsSubmitting(true);
    setError("");

    const result = await authClient.signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });

    setIsSubmitting(false);
    if (result.error) {
      setError(result.error.message ?? "Could not sign in.");
      return;
    }

    onComplete();
  }

  return (
    <AuthForm
      error={error}
      isSubmitting={isSubmitting}
      onSubmit={submit}
      submitLabel="Sign in"
    >
      <label htmlFor="login-email">
        Email
        <Input
          autoComplete="email"
          id="login-email"
          name="email"
          required
          type="email"
        />
      </label>
      <label htmlFor="login-password">
        Password
        <PasswordInput
          autoComplete="current-password"
          id="login-password"
          name="password"
          required
        />
      </label>
    </AuthForm>
  );
}

export function ChangePasswordForm({ onComplete }: AuthFormProps) {
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const currentPassword = String(form.get("currentPassword"));
    const newPassword = String(form.get("newPassword"));
    const confirmation = String(form.get("confirmation"));

    if (newPassword !== confirmation) {
      setError("New passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    const response = await apiFetch("/session/change-password", {
      body: JSON.stringify({ currentPassword, newPassword }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    setIsSubmitting(false);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        message?: string;
      } | null;
      setError(data?.message ?? data?.error ?? "Could not change password.");
      return;
    }

    onComplete();
  }

  return (
    <AuthForm
      error={error}
      isSubmitting={isSubmitting}
      onSubmit={submit}
      submitLabel="Update password"
    >
      <label htmlFor="change-current-password">
        Temporary password
        <PasswordInput
          autoComplete="current-password"
          id="change-current-password"
          name="currentPassword"
          required
        />
      </label>
      <label htmlFor="change-new-password">
        New password
        <PasswordInput
          autoComplete="new-password"
          id="change-new-password"
          minLength={8}
          name="newPassword"
          required
        />
      </label>
      <label htmlFor="change-confirm-password">
        Confirm new password
        <PasswordInput
          autoComplete="new-password"
          id="change-confirm-password"
          minLength={8}
          name="confirmation"
          required
        />
      </label>
    </AuthForm>
  );
}

function AuthForm({
  children,
  error,
  isSubmitting,
  onSubmit,
  submitLabel,
}: PropsWithChildren<{
  error: string;
  isSubmitting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
}>) {
  return (
    <form className="auth-form" onSubmit={onSubmit}>
      {children}
      {error ? <p className="form-error">{error}</p> : null}
      <button className="primary-action" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Working..." : submitLabel}
      </button>
    </form>
  );
}
