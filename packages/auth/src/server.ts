import type { IncomingHttpHeaders } from "node:http";
import { db, hasUsers, markPasswordChanged } from "@rdio/db";
import { account, session, user, verification } from "@rdio/db/schema";
import { env, webOrigins } from "@rdio/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { fromNodeHeaders } from "better-auth/node";
import { admin } from "better-auth/plugins";

/** Reports whether the initial administrator has already completed application setup. */
export async function isSetupComplete() {
  return await hasUsers();
}

const authSchema = {
  account,
  session,
  user,
  verification,
};

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),
  trustedOrigins: webOrigins,
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      mustChangePassword: {
        type: "boolean",
        defaultValue: false,
        input: false,
      },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (context) => {
      if (context.path !== "/sign-up/email" || !(await isSetupComplete())) {
        return;
      }

      throw new APIError("FORBIDDEN", {
        message:
          "Signup is disabled. Ask an administrator to create your account.",
      });
    }),
  },
  databaseHooks: {
    user: {
      create: {
        before: async (newUser) => {
          if (await isSetupComplete()) {
            return;
          }

          return {
            data: {
              ...newUser,
              role: "admin",
            },
          };
        },
      },
    },
  },
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  plugins: [admin()],
});

/** Converts Node request headers into the Web Headers shape Better Auth expects. */
export function authHeaders(headers: IncomingHttpHeaders) {
  return fromNodeHeaders(headers);
}

/** Resolves the Better Auth session associated with a Node request. */
export function getSession(headers: IncomingHttpHeaders) {
  return auth.api.getSession({
    headers: authHeaders(headers),
  });
}

/** Changes a temporary password and clears the user's forced-change marker. */
export async function changeTemporaryPassword(
  headers: IncomingHttpHeaders,
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  await auth.api.changePassword({
    body: {
      currentPassword,
      newPassword,
      revokeOtherSessions: false,
    },
    headers: authHeaders(headers),
  });
  await markPasswordChanged(userId);
}

export type AuthSession = typeof auth.$Infer.Session;
