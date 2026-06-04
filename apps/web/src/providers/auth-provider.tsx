import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";
import { apiBaseUrl, apiFetch } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

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
        if (!cancelled) {
          setSetupRequired(data.setupRequired);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSetupRequired(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session.data]);

  const user = session.data ? (session.data.user as AuthUser) : null;
  let status: AuthStatus = "anonymous";

  if (session.isPending || (!user && setupRequired === null)) {
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
