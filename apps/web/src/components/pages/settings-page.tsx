import { useQuery } from "@tanstack/react-query";
import { SettingsLink, SettingsRow } from "@/components/ui/settings-list";
import { StationLoading } from "@/components/ui/station-loading";
import { API_BASE_URL } from "@/lib/constants";
import { stationQueryOptions } from "@/lib/queries/station";
import type { StationSummary } from "@/types/station";

export function SettingsPage() {
  const stationQuery = useQuery(stationQueryOptions());

  if (!stationQuery.data) {
    return <StationLoading failed={stationQuery.isError} />;
  }

  return <StationSettings station={stationQuery.data} />;
}

export function StationSettings({ station }: { station: StationSummary }) {
  const fallbackDetail = fallbackSourceDetail(station.fallbackSource);

  return (
    <section aria-label={`${station.name} settings`} className="settings-view">
      <div className="settings-list">
        <SettingsRow label="Name" value={station.name} />
        <SettingsRow label="Station ID" value={station.id} />
        <SettingsRow label="Slug" value={station.slug} />
        <SettingsRow label="Timezone" value={station.timezone} />
        <SettingsRow label="Mount" value={station.mount} />
        <SettingsRow label="Stream URL" value={station.streamUrl} />
        <SettingsRow
          label="Fallback type"
          value={station.fallbackSource.kind}
        />
        <SettingsRow label="Fallback source" value={fallbackDetail} />
        <SettingsLink href={API_BASE_URL} label="API" />
        <SettingsLink
          href={`http://${station.icecast.host}:${station.icecast.port}`}
          label="Icecast"
        />
      </div>
    </section>
  );
}

function fallbackSourceDetail(
  fallbackSource: StationSummary["fallbackSource"]
) {
  if (fallbackSource.kind === "playlist") {
    return fallbackSource.playlistId;
  }

  if (fallbackSource.kind === "track") {
    return fallbackSource.trackId;
  }

  if (fallbackSource.kind === "live") {
    return fallbackSource.inputId;
  }

  return "default";
}
