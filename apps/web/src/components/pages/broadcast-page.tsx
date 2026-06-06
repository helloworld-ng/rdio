import { useQuery } from "@tanstack/react-query";
import { Radio } from "lucide-react";
import { useEffect, useState } from "react";
import { SettingsRow } from "@/components/ui/settings-list";
import { StationLoading } from "@/components/ui/station-loading";
import { apiFetch } from "@/lib/api";
import { stationQueryOptions } from "@/lib/queries/station";
import type { BroadcastIcecastSettings, StationSummary } from "@/types/station";

const leadingSlashPattern = /^\//;

export function BroadcastPage() {
  const stationQuery = useQuery(stationQueryOptions());

  if (!stationQuery.data) {
    return <StationLoading failed={stationQuery.isError} />;
  }

  return <BroadcastView station={stationQuery.data} />;
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
  const tlsPort = icecast.tlsPort;
  const sourcePassword = broadcastSettings?.sourcePassword;

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await apiFetch("/broadcast/status");
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
          {tlsPort ? (
            <>
              <p className="broadcast-settings-note">
                If connecting from a restricted network, use TLS (SSL on) with
                port {tlsPort}. Otherwise use the standard settings below.
              </p>
              <div className="settings-list">
                <SettingsRow label="Application" value="BUTT" />
                <SettingsRow
                  label="Server type"
                  value="Icecast / Liquidsoap Harbor"
                />
                <SettingsRow label="Address" value={icecast.host} />
                <SettingsRow label="Port" value={String(tlsPort)} />
                <SettingsRow label="SSL / TLS" value="On" />
                <SettingsRow label="User" value="source" />
                <SettingsRow
                  label="Password"
                  value={sourcePassword ?? "Unavailable"}
                />
                <SettingsRow label="Mount" value={mount} />
              </div>
            </>
          ) : null}
          <p className="broadcast-settings-note">
            {tlsPort ? "Standard connection (no SSL):" : "Connection settings:"}
          </p>
          <div className="settings-list">
            <SettingsRow label="Application" value="BUTT" />
            <SettingsRow
              label="Server type"
              value="Icecast / Liquidsoap Harbor"
            />
            <SettingsRow label="Address" value={icecast.host} />
            <SettingsRow label="Port" value={String(icecast.port)} />
            {tlsPort ? <SettingsRow label="SSL / TLS" value="Off" /> : null}
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
  const res = await apiFetch("/broadcast/settings");

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
