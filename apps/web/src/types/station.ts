import type { FallbackSource } from "@rdio/rdio-core";

export interface IcecastSettings {
  host: string;
  mount: string;
  port: number;
}

export interface BroadcastIcecastSettings extends IcecastSettings {
  sourcePassword: string;
}

export interface StationSummary {
  broadcastIcecast: IcecastSettings & { sourcePassword?: string };
  fallbackSource: FallbackSource;
  icecast: IcecastSettings;
  id: string;
  mount: string;
  name: string;
  slug: string;
  streamUrl: string;
  timezone: string;
}

export interface UploadedFileSummary {
  duration?: number;
  name: string;
  size: number;
}

export interface MediaItem {
  id: string;
  name: string;
  size: number;
  type: "audio" | "image";
  uploadedAt: string;
  url: string;
}

export interface Program {
  description: string;
  host: string;
  id: string;
  title: string;
}

export interface ScheduleBlock {
  dateKey: string;
  description: string;
  endMinutes: number;
  file?: UploadedFileSummary;
  hosts: string[];
  id: string;
  kind: "recording" | "broadcast";
  mediaId?: string;
  programId?: string;
  startMinutes: number;
  title: string;
}

export type ScheduleBlockDraft = Omit<ScheduleBlock, "id" | "dateKey">;

export interface DragDropPreview {
  canDrop: boolean;
  durationMinutes: number;
  startMinutes: number;
}

export interface CreationRequest {
  dateKey: string;
  hour: number;
  kind: ScheduleBlock["kind"] | null;
}
