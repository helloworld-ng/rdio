import { createFileRoute, Navigate } from "@tanstack/react-router";
import { AuthLoadingPage, SetupPage } from "@/components/pages/auth-pages";
import { useAuth } from "@/providers/auth-provider";

export const Route = createFileRoute("/_auth/setup")({
  component: SetupRoute,
});

function SetupRoute() {
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

  if (!setupRequired) {
    return <Navigate to="/login" />;
  }

  return <SetupPage />;
}
