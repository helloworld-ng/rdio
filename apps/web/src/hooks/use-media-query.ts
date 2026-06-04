import { useEffect, useState } from "react";

/** Tracks whether a browser media query currently matches. */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    const syncMatches = () => setMatches(media.matches);

    syncMatches();
    media.addEventListener("change", syncMatches);

    return () => media.removeEventListener("change", syncMatches);
  }, [query]);

  return matches;
}
