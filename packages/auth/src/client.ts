import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/** Creates the browser auth client configured for the rdio API origin. */
export function createRdioAuthClient(baseURL: string) {
  return createAuthClient({
    baseURL,
    fetchOptions: {
      credentials: "include",
    },
    plugins: [
      inferAdditionalFields({
        user: {
          mustChangePassword: {
            type: "boolean",
            input: false,
          },
        },
      }),
    ],
  });
}
