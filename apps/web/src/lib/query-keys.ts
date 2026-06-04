import { createQueryKeyStore } from "@lukemorales/query-key-factory";

/** Central registry for React Query cache keys. */
export const queryKeys = createQueryKeyStore({
  auth: {
    setupStatus: null,
  },
  hosts: {
    all: null,
  },
  media: {
    all: null,
  },
  members: {
    all: null,
  },
  programs: {
    all: null,
  },
  scheduleBlocks: {
    all: null,
  },
  station: {
    detail: null,
  },
});
