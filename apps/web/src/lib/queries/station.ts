import { queryOptions } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { StationResponse } from "@/types/api";

/** Builds the React Query options for the active station record. */
export const stationQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.station.detail.queryKey,
    queryFn: async () => {
      const response = await apiFetch("/station");

      if (!response.ok) {
        throw new Error(`Station request failed with ${response.status}`);
      }

      const data = (await response.json()) as StationResponse;
      return data.station;
    },
  });
