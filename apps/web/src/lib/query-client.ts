import { QueryClient } from "@tanstack/react-query";

/** Creates the shared React Query client used for frontend server state. */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 30_000,
      },
    },
  });
}
