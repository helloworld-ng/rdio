import { useCallback, useEffect, useState } from "react";

export interface CookieOptions {
  maxAge?: number;
  path?: string;
  sameSite?: "Lax" | "None" | "Strict";
  secure?: boolean;
}

function getCookieValue(name: string): string | undefined {
  if (typeof document === "undefined") {
    return;
  }

  const encodedName = `${encodeURIComponent(name)}=`;
  const cookie = document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(encodedName));

  if (!cookie) {
    return;
  }

  return decodeURIComponent(cookie.slice(encodedName.length));
}

function serializeCookie(
  name: string,
  value: string,
  options: CookieOptions = {}
) {
  const parts = [
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
    `path=${options.path ?? "/"}`,
  ];

  if (typeof options.maxAge === "number") {
    parts.push(`max-age=${options.maxAge}`);
  }

  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`);
  }

  if (options.secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

export function useCookie(
  name: string,
  initialValue = ""
): [string, (value: string, options?: CookieOptions) => void, () => void] {
  const [value, setValue] = useState(
    () => getCookieValue(name) ?? initialValue
  );

  useEffect(() => {
    setValue(getCookieValue(name) ?? initialValue);
  }, [initialValue, name]);

  const writeCookie = useCallback(
    (nextValue: string, options?: CookieOptions) => {
      // biome-ignore lint/suspicious/noDocumentCookie: UI preference cookies need client-side writes.
      document.cookie = serializeCookie(name, nextValue, options);
      setValue(nextValue);
    },
    [name]
  );

  const deleteCookie = useCallback(() => {
    // biome-ignore lint/suspicious/noDocumentCookie: UI preference cookies need client-side writes.
    document.cookie = serializeCookie(name, "", { maxAge: 0 });
    setValue(initialValue);
  }, [initialValue, name]);

  return [value, writeCookie, deleteCookie];
}
