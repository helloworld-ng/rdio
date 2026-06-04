import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type {
  ApiErrorResponse,
  CreateMemberInput,
  MembersResponse,
  UpdateMemberRoleInput,
} from "@/types/api";

/** Builds the React Query options for admin-managed members. */
export const membersQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.members.all.queryKey,
    queryFn: async () => {
      const response = await apiFetch("/members");

      if (!response.ok) {
        throw new Error("Could not load members.");
      }

      const data = (await response.json()) as MembersResponse;
      return data.users;
    },
  });

/** Creates a member and refreshes the members list. */
export function useCreateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (member: CreateMemberInput) => {
      const response = await apiFetch("/members", {
        body: JSON.stringify(member),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        const body = (await response
          .json()
          .catch(() => null)) as ApiErrorResponse | null;

        throw new Error(body?.message ?? "Could not create member.");
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.members.all.queryKey,
      }),
  });
}

/** Deletes a member and refreshes the members list. */
export function useDeleteMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiFetch(`/members/${id}`, { method: "DELETE" });

      if (!response.ok) {
        throw new Error("Could not delete member.");
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.members.all.queryKey,
      }),
  });
}

/** Updates a member role and refreshes the members list. */
export function useUpdateMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, role }: UpdateMemberRoleInput) => {
      const response = await apiFetch(`/members/${id}`, {
        body: JSON.stringify({ role }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });

      if (!response.ok) {
        throw new Error("Could not update role.");
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.members.all.queryKey,
      }),
  });
}
