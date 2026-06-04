import type { HostRecord } from "@/types/host";
import type {
  MediaItem,
  Program,
  ScheduleBlock,
  StationSummary,
} from "@/types/station";

export interface StationResponse {
  station: StationSummary;
}

export interface HostsResponse {
  hosts: HostRecord[];
}

export interface ProgramsResponse {
  programs: Program[];
}

export interface ProgramResponse {
  program: Program;
}

export interface MediaResponse {
  media: MediaItem[];
}

export interface MediaItemResponse {
  media: MediaItem;
}

export interface ScheduleBlocksResponse {
  blocks: ScheduleBlock[];
  version: string;
}

export interface ScheduleMutationResponse {
  blocks?: ScheduleBlock[];
  version?: string;
}

export interface ApiErrorResponse {
  error?: string;
  message?: string;
}

export interface Member {
  email: string;
  id: string;
  mustChangePassword?: boolean;
  name: string;
  role?: string | null;
}

export interface MembersResponse {
  users: Member[];
}

export interface CreateMemberInput {
  email: string;
  name: string;
  password: string;
}

export interface UpdateMemberRoleInput {
  id: string;
  role: string;
}
