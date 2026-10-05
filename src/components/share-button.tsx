import { Button } from "@/components/ui/button";
import type { Artwork } from "@/lib/met/normalize";
import { useCopyToClipboard } from "@/lib/use-copy-to-clipboard";
import { CheckIcon, ShareIcon } from "./icons";

export function ShareButton({ artwork }: { artwork: Artwork }) {
  const { copied, copyFailed, copy } = useCopyToClipboard(2200);

  async function handleShare() {
    const url =
      typeof window !== "undefined"
        ? window.location.href
        : artwork.canonicalUrl;
    await copy(url);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="record-link"
      onClick={handleShare}
      aria-label={
        copyFailed
          ? "Copy failed — retry copying this object page link"
          : copied
            ? "Copied link — copy this object page link again"
            : "Share — copy this object page link"
      }
    >
      <span data-icon="inline-start">
        {copied ? <CheckIcon /> : <ShareIcon />}
      </span>
      <span>
        {copyFailed ? "Copy failed" : copied ? "Copied link" : "Share"}
      </span>
    </Button>
  );
}
