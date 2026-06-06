import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    API_PORT: z.coerce.number().int().positive().default(3001),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url().default("http://localhost:3001"),
    DATABASE_URL: z.string().min(1),
    HARBOR_PORT: z.coerce.number().int().positive().default(8005),
    HARBOR_TLS_PORT: z.coerce.number().int().positive().default(8443),
    ICECAST_HOST: z.string().min(1).default("localhost"),
    ICECAST_PORT: z.coerce.number().int().positive().default(8000),
    ICECAST_SOURCE_PASSWORD: z.string().min(1).default("sourcepass"),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    PUBLIC_STREAM_BASE_URL: z.url().default("http://localhost:8000"),
    /** Public hostname for BUTT/Harbor (Liquidsoap), separate from the web/nginx origin. */
    BROADCAST_HOST: z.string().min(1).optional(),
    WEB_ORIGIN: z.string().min(1).default("http://localhost:5173"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});

export const webOrigins = env.WEB_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
