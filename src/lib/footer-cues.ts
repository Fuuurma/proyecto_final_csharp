export type FooterCue = {
  keys: string[];
  label: string;
};

/**
 * The footer shortcut legend used to advertise every cue on every page,
 * but `/` is bound only on Explore and the arrow flip + Esc close only
 * on object records — chrome claimed shortcuts the page didn't have
 * (grok 09-10 02:45 #9). Cues are now derived from the route.
 */
export function footerCues(pathname: string): FooterCue[] {
  if (pathname === "/explore") {
    return [{ keys: ["/"], label: "Focus Explore search" }];
  }
  if (/^\/art\/[^/]+$/.test(pathname)) {
    return [
      { keys: ["←", "→"], label: "Flip object records" },
      { keys: ["Esc"], label: "Close inspection" },
    ];
  }
  return [];
}
