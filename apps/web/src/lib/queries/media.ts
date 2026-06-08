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
  MediaUploadUrlResponse,
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

/** Uploads a media file directly to R2, then registers it with the API. */
export function useUploadMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const contentType = file.type || "application/octet-stream";
      const uploadUrlResponse = await apiFetch("/media/upload-url", {
        body: JSON.stringify({
          contentType,
          fileName: file.name,
          size: file.size,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!uploadUrlResponse.ok) {
        throw new Error(
          `Could not prepare upload (${uploadUrlResponse.status}). Sign in and try again.`
        );
      }

      const uploadTarget =
        (await uploadUrlResponse.json()) as MediaUploadUrlResponse;

      const putResponse = await fetch(uploadTarget.uploadUrl, {
        body: file,
        headers: {
          "Content-Type": contentType,
        },
        method: "PUT",
      });

      if (!putResponse.ok) {
        throw new Error(
          `Direct upload to storage failed (${putResponse.status}). Check R2 CORS allows ${window.location.origin}.`
        );
      }

      const completeResponse = await apiFetch("/media/complete", {
        body: JSON.stringify({
          mediaId: uploadTarget.mediaId,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!completeResponse.ok) {
        throw new Error(
          `Upload reached storage but registration failed (${completeResponse.status}).`
        );
      }

      const data = (await completeResponse.json()) as MediaItemResponse;
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
