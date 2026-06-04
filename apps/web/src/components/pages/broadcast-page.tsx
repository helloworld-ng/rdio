import { Radio } from "lucide-react";
import { useEffect, useState } from "react";
import { useCurrentStation } from "@/app";
import { SettingsRow } from "@/components/ui/settings-list";
import { apiBaseUrl, apiFetch } from "@/lib/api";
import type { BroadcastIcecastSettings, StationSummary } from "@/types/station";

const leadingSlashPattern = /^\//;

export function BroadcastPage() {
  const station = useCurrentStation();

  return <BroadcastView station={station} />;
}

function BroadcastView({ station }: { station: StationSummary }) {
  const [isConnected, setIsConnected] = useState(false);
  const [broadcastSettings, setBroadcastSettings] =
    useState<BroadcastIcecastSettings | null>(() =>
      broadcastCredentialsFromStation(station)
    );
  const [settingsError, setSettingsError] = useState("");
  const icecast = broadcastSettings ?? station.broadcastIcecast;
  const mount = icecast.mount.replace(leadingSlashPattern, "");
  const sourcePassword = broadcastSettings?.sourcePassword;

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch(`${apiBaseUrl}/broadcast/status`);
        if (!cancelled && res.ok) {
          const data = (await res.json()) as { active: boolean };
          setIsConnected(data.active);
        }
      } catch {
        /* ignore */
      }
      if (!cancelled) {
        setTimeout(poll, 3000);
      }
    }
    poll().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadBroadcastSettings() {
      try {
        const nextSettings = await fetchBroadcastSettings();

        if (cancelled) {
          return;
        }

        if (nextSettings) {
          setBroadcastSettings(nextSettings);
          setSettingsError("");
          return;
        }

        const stationSettings = broadcastCredentialsFromStation(station);
        if (stationSettings) {
          setBroadcastSettings(stationSettings);
          setSettingsError("");
          return;
        }

        setSettingsError(
          "Broadcast credentials are unavailable. Redeploy the API."
        );
      } catch {
        if (!(cancelled || broadcastCredentialsFromStation(station))) {
          setSettingsError(
            "Broadcast credentials are unavailable. Sign in again or check the API deployment."
          );
        }
      }
    }

    loadBroadcastSettings().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [station]);

  return (
    <section aria-label="Broadcast" className="broadcast-view">
      <div className="library-header">
        <div>
          <Radio aria-hidden="true" size={18} strokeWidth={1.8} />
          <strong>Broadcast</strong>
        </div>
      </div>
      <div className="broadcast-console">
        <section
          aria-label="Broadcast source status"
          className="broadcast-status-panel"
        >
          <div
            aria-hidden="true"
            className={isConnected ? "source-light is-on" : "source-light"}
          />
          <div>
            <strong>
              {isConnected ? "Source connected" : "Waiting for source"}
            </strong>
            <span>
              {isConnected
                ? "BUTT is connected to the station input."
                : "Connect BUTT with the settings below."}
            </span>
          </div>
        </section>
        <section aria-label="BUTT settings" className="broadcast-settings">
          {settingsError ? <p className="form-error">{settingsError}</p> : null}
          <div className="settings-list">
            <SettingsRow label="Application" value="BUTT" />
            <SettingsRow
              label="Server type"
              value="Icecast / Liquidsoap Harbor"
            />
            <SettingsRow label="Address" value={icecast.host} />
            <SettingsRow label="Port" value={String(icecast.port)} />
            <SettingsRow label="User" value="source" />
            <SettingsRow
              label="Password"
              value={sourcePassword ?? "Unavailable"}
            />
            <SettingsRow label="Mount" value={mount} />
          </div>
        </section>
      </div>
    </section>
  );
}

async function fetchBroadcastSettings(): Promise<BroadcastIcecastSettings | null> {
  const res = await apiFetch(`${apiBaseUrl}/broadcast/settings`);

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new Error(`Broadcast settings request failed with ${res.status}`);
  }

  const data = (await res.json()) as {
    broadcastIcecast: BroadcastIcecastSettings;
  };

  return data.broadcastIcecast;
}

function broadcastCredentialsFromStation(
  station: StationSummary
): BroadcastIcecastSettings | null {
  const { sourcePassword } = station.broadcastIcecast;

  if (!sourcePassword) {
    return null;
  }

  return { ...station.broadcastIcecast, sourcePassword };
}
