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
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending) clearTimeout(timer);
    };
  }, []);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      const schedule = (setState: () => void) => {
        timers.current.push(window.setTimeout(setState, resetMs));
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
