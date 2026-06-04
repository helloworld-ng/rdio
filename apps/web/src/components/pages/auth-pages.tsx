import type { PropsWithChildren } from "react";
import {
  ChangePasswordForm,
  LoginForm,
  SetupForm,
} from "@/components/auth/auth-forms";
import { useAuth } from "@/providers/auth-provider";

export function AuthLoadingPage() {
  return (
    <AuthPage description="Checking your session..." title="Loading station" />
  );
}

export function SetupPage() {
  const { refreshSession } = useAuth();

  return (
    <AuthPage
      description="Create the first administrator account. Additional members can be added after sign-in."
      title="Set up your station"
    >
      <SetupForm onComplete={refreshSession} />
    </AuthPage>
  );
}

export function LoginPage() {
  const { refreshSession } = useAuth();

  return (
    <AuthPage
      description="Use your station account to open the control room."
      title="Sign in"
    >
      <LoginForm onComplete={refreshSession} />
    </AuthPage>
  );
}

export function ChangePasswordPage() {
  const { refreshSession } = useAuth();

  return (
    <AuthPage
      description="Replace the temporary password before opening the station dashboard."
      title="Choose a new password"
    >
      <ChangePasswordForm onComplete={refreshSession} />
    </AuthPage>
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
