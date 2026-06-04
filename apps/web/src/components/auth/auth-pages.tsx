import {
  type FormEvent,
  type InputHTMLAttributes,
  type PropsWithChildren,
  useRef,
  useState,
} from "react";
import { apiBaseUrl, apiFetch } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { useAuth } from "@/providers/auth-provider";

export function AuthLoadingPage() {
  return (
    <AuthPage description="Checking your session..." title="Loading station" />
  );
}

export function SetupPage() {
  const { refreshSession } = useAuth();
  return <SetupForm onComplete={refreshSession} />;
}

export function LoginPage() {
  const { refreshSession } = useAuth();
  return <LoginForm onComplete={refreshSession} />;
}

export function ChangePasswordPage() {
  const { refreshSession } = useAuth();
  return <ChangePasswordForm onComplete={refreshSession} />;
}

function AuthPage({
  children,
  description,
  title,
}: PropsWithChildren<{ description: string; title: string }>) {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <span className="auth-brand">rdio</span>
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {children}
      </section>
    </main>
  );
}

function SetupForm({ onComplete }: { onComplete: () => void }) {
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
    <AuthPage
      description="Create the first administrator account. Additional members can be added after sign-in."
      title="Set up your station"
    >
      <AuthForm
        error={error}
        isSubmitting={isSubmitting}
        onSubmit={submit}
        submitLabel="Create administrator"
      >
        <label>
          Name
          <input autoComplete="name" name="name" required />
        </label>
        <label>
          Email
          <input autoComplete="email" name="email" required type="email" />
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
    </AuthPage>
  );
}

function LoginForm({ onComplete }: { onComplete: () => void }) {
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
    <AuthPage
      description="Use your station account to open the control room."
      title="Sign in"
    >
      <AuthForm
        error={error}
        isSubmitting={isSubmitting}
        onSubmit={submit}
        submitLabel="Sign in"
      >
        <label>
          Email
          <input autoComplete="email" name="email" required type="email" />
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
    </AuthPage>
  );
}

function ChangePasswordForm({ onComplete }: { onComplete: () => void }) {
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
    const response = await apiFetch(`${apiBaseUrl}/auth/change-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setIsSubmitting(false);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as {
        message?: string;
        error?: string;
      } | null;
      setError(data?.message ?? data?.error ?? "Could not change password.");
      return;
    }

    onComplete();
  }

  return (
    <AuthPage
      description="Replace the temporary password before opening the station dashboard."
      title="Choose a new password"
    >
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
    </AuthPage>
  );
}

function PasswordInput(
  props: Omit<InputHTMLAttributes<HTMLInputElement>, "type">
) {
  const [visible, setVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function toggle() {
    setVisible((value) => !value);
    // Keep focus on input after toggling password visibility.
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <span className="password-input-wrap">
      <input {...props} ref={inputRef} type={visible ? "text" : "password"} />
      <button
        aria-label={visible ? "Hide password" : "Show password"}
        className="password-toggle"
        onClick={toggle}
        type="button"
      >
        {visible ? (
          <svg
            aria-hidden="true"
            fill="none"
            height="16"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            width="16"
          >
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <line x1="1" x2="23" y1="1" y2="23" />
          </svg>
        ) : (
          <svg
            aria-hidden="true"
            fill="none"
            height="16"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            width="16"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </span>
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
