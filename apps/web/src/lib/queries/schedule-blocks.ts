import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { ScheduleBlocksResponse } from "@/types/api";
import type { ScheduleBlock } from "@/types/station";

/** Builds the React Query options for the persisted schedule timeline. */
export const scheduleBlocksQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.scheduleBlocks.all.queryKey,
    queryFn: async () => {
      const response = await apiFetch("/schedule-blocks");

      if (!response.ok) {
        throw new Error(`Schedule request failed with ${response.status}`);
      }

      return (await response.json()) as ScheduleBlocksResponse;
    },
  });

/** Saves the full schedule block list and refreshes the canonical timeline. */
export function useSaveScheduleBlocks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      blocks,
      version,
    }: {
      blocks: ScheduleBlock[];
      version: string | null;
    }) => {
      const response = await apiFetch("/schedule-blocks", {
        body: JSON.stringify({ blocks, version }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      });
      const data =
        (await response.json()) as Partial<ScheduleBlocksResponse> & {
          error?: string;
        };

      if (!response.ok) {
        throw Object.assign(
          new Error(data.error ?? "Could not save schedule changes."),
          {
            response,
            data,
          }
        );
      }

      return data;
    },
    onSuccess: (data) => {
      if (data.blocks && typeof data.version === "string") {
        queryClient.setQueryData(queryKeys.scheduleBlocks.all.queryKey, {
          blocks: data.blocks,
          version: data.version,
        });
        return;
      }

      queryClient.invalidateQueries({
        queryKey: queryKeys.scheduleBlocks.all.queryKey,
      });
    },
  });
}
