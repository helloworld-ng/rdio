import { databaseEnv } from "@rdio/env/database";
import { count, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { account, session, user, verification } from "./schema/index.js";

const schema = {
  account,
  session,
  user,
  verification,
};

export const pool = new pg.Pool({
  connectionString: databaseEnv.DATABASE_URL,
});

export const db = drizzle(pool, { schema });

/** Reports whether any user exists, which distinguishes first-run setup from normal login. */
export async function hasUsers() {
  const [result] = await db.select({ count: count() }).from(schema.user);
  return result.count > 0;
}

/** Clears the forced password-change marker after a member replaces temporary credentials. */
export async function markPasswordChanged(userId: string) {
  await db
    .update(schema.user)
    .set({ mustChangePassword: false })
    .where(eq(schema.user.id, userId));
}

export * from "./schema/index.js";
