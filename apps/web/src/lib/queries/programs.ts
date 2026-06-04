import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type {
  ProgramResponse,
  ProgramsResponse,
  ScheduleMutationResponse,
} from "@/types/api";
import type { Program } from "@/types/station";

/** Builds the React Query options for the station programs list. */
export const programsQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.programs.all.queryKey,
    queryFn: async () => {
      const response = await apiFetch("/programs");

      if (!response.ok) {
        throw new Error(`Programs request failed with ${response.status}`);
      }

      const data = (await response.json()) as ProgramsResponse;
      return data.programs;
    },
  });

/** Creates a program and refreshes program server state. */
export function useCreateProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (program: Omit<Program, "id">) => {
      const response = await apiFetch("/programs", {
        body: JSON.stringify(program),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Create program failed with ${response.status}`);
      }

      const data = (await response.json()) as ProgramResponse;
      return data.program;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.programs.all.queryKey,
      }),
  });
}

/** Updates a program and refreshes affected schedule blocks. */
export function useUpdateProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      program,
      programId,
    }: {
      program: Omit<Program, "id">;
      programId: string;
    }) => {
      const response = await apiFetch(`/programs/${programId}`, {
        body: JSON.stringify(program),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      });

      if (!response.ok) {
        throw new Error(`Update program failed with ${response.status}`);
      }

      return (await response.json()) as ProgramResponse &
        ScheduleMutationResponse;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.programs.all.queryKey,
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.scheduleBlocks.all.queryKey,
      });
    },
  });
}

/** Deletes a program and refreshes affected schedule blocks. */
export function useDeleteProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (programId: string) => {
      const response = await apiFetch(`/programs/${programId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`Delete program failed with ${response.status}`);
      }

      return (await response.json()) as ScheduleMutationResponse;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.programs.all.queryKey,
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.scheduleBlocks.all.queryKey,
      });
    },
  });
}
