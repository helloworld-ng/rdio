import { createFileRoute, Navigate } from "@tanstack/react-router";
import { AuthLoadingPage, LoginPage } from "@/components/pages/auth-pages";
import { useAuth } from "@/providers/auth-provider";

export const Route = createFileRoute("/_auth/login")({
  component: LoginRoute,
});

function LoginRoute() {
  const { setupRequired, status } = useAuth();

  if (status === "loading") {
    return <AuthLoadingPage />;
  }

  if (status === "authenticated") {
    return <Navigate to="/schedule" />;
  }

  if (status === "password-change-required") {
    return <Navigate to="/change-password" />;
  }

  if (setupRequired) {
    return <Navigate to="/setup" />;
  }

  return <LoginPage />;
}
