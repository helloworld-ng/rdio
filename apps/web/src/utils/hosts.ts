import { hostPalette } from "@/components/HostAvatar";
import type { HostRecord } from "@/types/host";

/** Returns the display names used by host select controls. */
export function getHostNames(hosts: HostRecord[]): string[] {
  return hosts.map((host) => host.name);
}

/** Finds a host by display name. */
export function findHost(
  hosts: HostRecord[],
  name: string
): HostRecord | undefined {
  return hosts.find((host) => host.name === name);
}

/** Adds a host with the next palette color when the name is new. */
export function addHostByName(hosts: HostRecord[], name: string): HostRecord[] {
  const normalized = name.trim();

  if (!normalized || hosts.some((host) => host.name === normalized)) {
    return hosts;
  }

  const colorId = hostPalette[hosts.length % hostPalette.length].id;

  return [...hosts, { name: normalized, colorId }];
}
