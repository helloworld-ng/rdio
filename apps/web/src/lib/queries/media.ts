import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type {
  MediaItemResponse,
  MediaResponse,
  ScheduleMutationResponse,
} from "@/types/api";

/** Builds the React Query options for uploaded station media. */
export const mediaQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.media.all.queryKey,
    queryFn: async () => {
      const response = await apiFetch("/media");

      if (!response.ok) {
        throw new Error(`Media request failed with ${response.status}`);
      }

      const data = (await response.json()) as MediaResponse;
      return data.media;
    },
  });

/** Uploads a media file and refreshes the media library. */
export function useUploadMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const response = await apiFetch("/media", {
        body: file,
        headers: {
          "Content-Type": file.type || "application/octet-stream",
          "X-File-Name": file.name,
        },
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Upload media failed with ${response.status}`);
      }

      const data = (await response.json()) as MediaItemResponse;
      return data.media;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.media.all.queryKey }),
  });
}

/** Deletes a media file and refreshes schedule blocks that may reference it. */
export function useDeleteMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mediaId: string) => {
      const response = await apiFetch(`/media/${encodeURIComponent(mediaId)}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`Delete media failed with ${response.status}`);
      }

      return (await response.json()) as ScheduleMutationResponse;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.media.all.queryKey,
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.scheduleBlocks.all.queryKey,
      });
    },
  });
}
