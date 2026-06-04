import { useQuery } from "@tanstack/react-query";
import { createContext, type PropsWithChildren, useContext } from "react";
import { apiFetch } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { queryKeys } from "@/lib/query-keys";

export interface AuthUser {
  email: string;
  id: string;
  mustChangePassword: boolean;
  name: string;
  role?: string | null;
}

type AuthStatus =
  | "anonymous"
  | "authenticated"
  | "loading"
  | "password-change-required";

interface AuthContextValue {
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  setupRequired: boolean | null;
  status: AuthStatus;
  user: AuthUser | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}

export function useAuthenticatedUser() {
  const { user } = useAuth();
  if (!user) {
    throw new Error("This component requires an authenticated user.");
  }

  return user;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const session = authClient.useSession();
  const setupStatus = useQuery({
    enabled: !session.data,
    queryKey: queryKeys.auth.setupStatus.queryKey,
    queryFn: async () => {
      const response = await apiFetch("/auth/setup-status");

      if (!response.ok) {
        throw new Error("Could not check setup status");
      }

      return (await response.json()) as { setupRequired: boolean };
    },
    retry: false,
  });

  const user = session.data ? (session.data.user as AuthUser) : null;
  const setupRequired = setupStatus.isError
    ? false
    : (setupStatus.data?.setupRequired ?? null);
  let status: AuthStatus = "anonymous";

  if (
    session.isPending ||
    (!user && (setupStatus.isPending || setupRequired === null))
  ) {
    status = "loading";
  } else if (user?.mustChangePassword) {
    status = "password-change-required";
  } else if (user) {
    status = "authenticated";
  }

  return (
    <AuthContext.Provider
      value={{
        setupRequired,
        status,
        user,
        refreshSession: async () => {
          await session.refetch();
        },
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
