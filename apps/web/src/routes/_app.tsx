import { createFileRoute, Navigate } from "@tanstack/react-router";
import { AppLayout } from "@/app";
import { AuthLoadingPage } from "@/components/auth/auth-pages";
import { useAuth } from "@/providers/auth-provider";

export const Route = createFileRoute("/_app")({
  component: AppRoute,
});

function AppRoute() {
  const { setupRequired, status } = useAuth();

  if (status === "loading") {
    return <AuthLoadingPage />;
  }

  if (status === "anonymous") {
    return <Navigate to={setupRequired ? "/setup" : "/login"} />;
  }

  if (status === "password-change-required") {
    return <Navigate to="/change-password" />;
  }

  return <AppLayout />;
}
