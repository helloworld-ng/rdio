import {
  createContext,
  type FormEvent,
  type InputHTMLAttributes,
  type PropsWithChildren,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { apiBaseUrl, apiFetch } from "../lib/api";
import { authClient } from "../lib/auth-client";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role?: string | null;
  mustChangePassword: boolean;
}

interface AuthContextValue {
  user: AuthUser;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthGate");
  }

  return context;
}

export function AuthGate({ children }: PropsWithChildren) {
  const session = authClient.useSession();
  const [setupRequired, setSetupRequired] = useState<boolean | null>(null);

  useEffect(() => {
    if (session.data) {
      return;
    }

    let cancelled = false;
    apiFetch(`${apiBaseUrl}/auth/setup-status`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Could not check setup status");
        }

        const data = (await response.json()) as { setupRequired: boolean };
        if (!cancelled) setSetupRequired(data.setupRequired);
      })
      .catch(() => {
        if (!cancelled) setSetupRequired(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session.data]);

  if (session.isPending || (!session.data && setupRequired === null)) {
    return (
      <AuthPage
        title="Loading station"
        description="Checking your session..."
      />
    );
  }

  if (!session.data) {
    return setupRequired ? (
      <SetupForm onComplete={() => session.refetch()} />
    ) : (
      <LoginForm onComplete={() => session.refetch()} />
    );
  }

  const user = session.data.user as AuthUser;
  if (user.mustChangePassword) {
    return <ChangePasswordForm onComplete={() => session.refetch()} />;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        logout: async () => {
          await authClient.signOut();
          await session.refetch();
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
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
      title="Set up your station"
      description="Create the first administrator account. Additional members can be added after sign-in."
    >
      <AuthForm
        error={error}
        isSubmitting={isSubmitting}
        onSubmit={submit}
        submitLabel="Create administrator"
      >
        <label>
          Name
          <input name="name" autoComplete="name" required />
        </label>
        <label>
          Email
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Password
          <PasswordInput
            name="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>
        <label>
          Confirm password
          <PasswordInput
            name="confirmPassword"
            autoComplete="new-password"
            minLength={8}
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
      title="Sign in"
      description="Use your station account to open the control room."
    >
      <AuthForm
        error={error}
        isSubmitting={isSubmitting}
        onSubmit={submit}
        submitLabel="Sign in"
      >
        <label>
          Email
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Password
          <PasswordInput
            name="password"
            autoComplete="current-password"
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
      title="Choose a new password"
      description="Replace the temporary password before opening the station dashboard."
    >
      <AuthForm
        error={error}
        isSubmitting={isSubmitting}
        onSubmit={submit}
        submitLabel="Update password"
      >
        <label>
          Temporary password
          <PasswordInput
            name="currentPassword"
            autoComplete="current-password"
            required
          />
        </label>
        <label>
          New password
          <PasswordInput
            name="newPassword"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>
        <label>
          Confirm new password
          <PasswordInput
            name="confirmation"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>
      </AuthForm>
    </AuthPage>
  );
}

function PasswordInput(
  props: Omit<InputHTMLAttributes<HTMLInputElement>, "type">,
) {
  const [visible, setVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function toggle() {
    setVisible((v) => !v);
    // keep focus on input after toggling
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <span className="password-input-wrap">
      <input {...props} ref={inputRef} type={visible ? "text" : "password"} />
      <button
        type="button"
        className="password-toggle"
        onClick={toggle}
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      <button className="primary-action" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Working..." : submitLabel}
      </button>
    </form>
  );
}
