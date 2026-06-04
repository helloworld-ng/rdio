import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({
  path: fileURLToPath(new URL("../../.env", import.meta.url)),
  quiet: true,
});

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to run Drizzle Kit");
}

export default defineConfig({
  schema: "./src/schema",
  out: "./src/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
