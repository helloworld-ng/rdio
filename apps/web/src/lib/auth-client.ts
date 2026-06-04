import { createRdioAuthClient } from "@rdio/auth/client";
import { API_BASE_URL } from "@/lib/constants";

export const authClient = createRdioAuthClient(API_BASE_URL);
