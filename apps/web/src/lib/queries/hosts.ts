import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { HostsResponse, ScheduleMutationResponse } from "@/types/api";
import type { HostRecord } from "@/types/host";

/** Builds the React Query options for the station hosts list. */
export const hostsQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.hosts.all.queryKey,
    queryFn: async () => {
      const response = await apiFetch("/hosts");

      if (!response.ok) {
        throw new Error(`Hosts request failed with ${response.status}`);
      }

      const data = (await response.json()) as HostsResponse;
      return data.hosts;
    },
  });

/** Creates a host and refreshes host-dependent server state. */
export function useCreateHost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (host: HostRecord) => {
      const response = await apiFetch("/hosts", {
        body: JSON.stringify(host),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Create host failed with ${response.status}`);
      }

      return host;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.hosts.all.queryKey }),
  });
}

/** Updates a host and refreshes lists that denormalize host names. */
export function useUpdateHost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      host,
      hostName,
    }: {
      host: HostRecord;
      hostName: string;
    }) => {
      const response = await apiFetch(
        `/hosts/${encodeURIComponent(hostName)}`,
        {
          body: JSON.stringify(host),
          headers: { "Content-Type": "application/json" },
          method: "PUT",
        }
      );

      if (!response.ok) {
        throw new Error(`Update host failed with ${response.status}`);
      }

      return (await response.json()) as {
        host: HostRecord;
      } & ScheduleMutationResponse;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.hosts.all.queryKey,
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.programs.all.queryKey,
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.scheduleBlocks.all.queryKey,
      });
    },
  });
}

/** Deletes a host and refreshes the hosts list. */
export function useDeleteHost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (hostName: string) => {
      const response = await apiFetch(
        `/hosts/${encodeURIComponent(hostName)}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error(`Delete host failed with ${response.status}`);
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.hosts.all.queryKey }),
  });
}
