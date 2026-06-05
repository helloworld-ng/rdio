import { createRdioAuthClient } from "@rdio/auth/client";
import { AUTH_BASE_URL } from "@/lib/constants";

export const authClient = createRdioAuthClient(AUTH_BASE_URL);
