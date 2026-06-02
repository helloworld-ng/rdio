import { createRdioAuthClient } from "@rdio/auth/client";
import { apiBaseUrl } from "./api";

export const authClient = createRdioAuthClient(apiBaseUrl);
