import { createFileRoute, Navigate } from "@tanstack/react-router";
import {
  AuthLoadingPage,
  ChangePasswordPage,
} from "@/components/pages/auth-pages";
import { useAuth } from "@/providers/auth-provider";

export const Route = createFileRoute("/_auth/change-password")({
  component: ChangePasswordRoute,
});

function ChangePasswordRoute() {
  const { setupRequired, status } = useAuth();

  if (status === "loading") {
    return <AuthLoadingPage />;
  }

  if (status === "authenticated") {
    return <Navigate to="/schedule" />;
  }

  if (status === "anonymous") {
    return <Navigate to={setupRequired ? "/setup" : "/login"} />;
  }

  return <ChangePasswordPage />;
}
