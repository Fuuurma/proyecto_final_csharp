import { useCallback, useEffect, useRef, useState } from "react";

const RESET_MS = 2000;

/**
 * One clipboard-feedback hook for the three surfaces that had the same
 * guard + try/catch + timed note triplicated (ShareButton, MetadataRow,
 * CopyListButton — devin 09-10 12:50 #3). Behavior normalized:
 * every failure note auto-clears after resetMs (ShareButton's used to
 * stick), and the copied/copyFailed window is uniform.
 */
export function useCopyToClipboard(resetMs: number = RESET_MS) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  // One tracked reset timer, cleared on re-copy: an array of timers let
  // a stale reset fire mid-feedback on rapid re-copy, truncating the
  // "Copied!" window (needs-work 09-17).
  const resetTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current !== null) clearTimeout(resetTimer.current);
    },
    [],
  );

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      const schedule = (setState: () => void) => {
        if (resetTimer.current !== null) clearTimeout(resetTimer.current);
        resetTimer.current = window.setTimeout(() => {
          resetTimer.current = null;
          setState();
        }, resetMs);
      };
      if (typeof navigator === "undefined" || !navigator.clipboard) {
        // Absent API (insecure context): say so instead of a silent
        // no-op (devin 09-09 22:57 clipboard bundle).
        setCopied(false);
        setCopyFailed(true);
        schedule(() => setCopyFailed(false));
        return false;
      }
      try {
        await navigator.clipboard.writeText(text);
        setCopyFailed(false);
        setCopied(true);
        schedule(() => setCopied(false));
        return true;
      } catch {
        // Surface the failure — a silent no-op button hides it.
        setCopied(false);
        setCopyFailed(true);
        schedule(() => setCopyFailed(false));
        return false;
      }
    },
    [resetMs],
  );

  return { copied, copyFailed, copy };
}
