import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArtworkImage } from "@/components/artwork-image";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowUpRightIcon,
  CloseIcon,
} from "@/components/icons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { curatedArtworks, featuredArtwork } from "@/data/curated-artworks";
import { type SelectionItem, useSelection } from "@/lib/selection";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/selection")({
  head: () => ({
    meta: [
      { title: "Selection — Meet the Met" },
      {
        name: "description",
        content:
          "Your locally saved works from the Met Open Access collection. Reorder, print, or copy the ledger.",
      },
      { property: "og:title", content: "Selection — Meet the Met" },
      {
        property: "og:description",
        content:
          "Your locally saved works from the Met Open Access collection.",
      },
    ],
  }),
  component: Selection,
});

function Selection() {
  const { items, isHydrated, remove, move, clear } = useSelection();

  return (
    <main
      className="page-frame selection-page"
      aria-labelledby="selection-heading"
    >
      <section className="selection-heading">
        <div>
          <span className="eyebrow">A temporary room</span>
          <h1 id="selection-heading">Your selection.</h1>
        </div>
        <p>
          Saved only in this browser. No account, sync, or museum affiliation.
          Arrange the hanging, then return to a work when you want another look.
        </p>
      </section>

      {!isHydrated ? (
        <div className="selection-status" aria-live="polite">
          <Skeleton className="selection-status__line" />
          <span className="sr-only">Reading your local selection…</span>
        </div>
      ) : items.length === 0 ? (
        <section className="selection-empty" aria-live="polite">
          <Empty>
            <EmptyHeader>
              <span className="eyebrow">Nothing saved yet</span>
              <EmptyTitle>Leave a work here.</EmptyTitle>
              <EmptyDescription>
                Save a few objects while you explore and they will stay in this
                browser.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Link
                to="/explore"
                className={cn(buttonVariants({ size: "lg" }), "button-link")}
              >
                Find a work
              </Link>
            </EmptyContent>
          </Empty>
          <Link
            to="/art/$objectId"
            params={{ objectId: String(featuredArtwork.id) }}
            className="selection-empty__image-link"
            aria-label={`Open ${featuredArtwork.displayTitle}`}
          >
            <ArtworkImage artwork={featuredArtwork} />
            <span className="selection-empty__image-caption mono">
              <span>Featured object</span>
              <span>
                Open record <ArrowUpRightIcon />
              </span>
            </span>
          </Link>
        </section>
      ) : (
        <>
          <div className="selection-toolbar">
            <span className="mono">
              {items.length} {items.length === 1 ? "object" : "objects"}
            </span>
            <div className="selection-toolbar__actions">
              <CopyListButton items={items} />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-button"
                onClick={() => {
                  if (typeof window !== "undefined") window.print();
                }}
              >
                Print ledger
              </Button>
              <Separator orientation="vertical" aria-hidden="true" />
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button variant="ghost" size="sm" className="text-button" />
                  }
                >
                  Clear selection
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear this selection?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This removes all {items.length} saved object
                      {items.length === 1 ? "" : "s"} from this browser. Your
                      selection is local and cannot be synced back.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep works</AlertDialogCancel>
                    <AlertDialogAction onClick={clear}>
                      Clear selection
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          <div className="selection-room">
            {items.map((item, index) => {
              const artwork = curatedArtworks.find(
                (candidate) => candidate.id === item.id,
              );
              return (
                <article className="selection-row" key={item.id}>
                  <Link
                    to="/art/$objectId"
                    params={{ objectId: String(item.id) }}
                    className="selection-row__image"
                  >
                    {artwork ? (
                      <ArtworkImage artwork={artwork} />
                    ) : item.primaryImageSmall ? (
                      <img src={item.primaryImageSmall} alt="" />
                    ) : null}
                  </Link>
                  <div className="selection-row__meta">
                    <span className="selection-row__index mono">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="eyebrow">
                      {item.date ?? "Date unknown"}
                    </span>
                    <h2>
                      <Link
                        to="/art/$objectId"
                        params={{ objectId: String(item.id) }}
                      >
                        {item.displayTitle}
                      </Link>
                    </h2>
                    <p>{item.artist ?? "Artist unknown"}</p>
                  </div>
                  <div className="selection-row__actions">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="icon-button"
                      onClick={() => move(item.id, -1)}
                      disabled={index === 0}
                      aria-label={`Move ${item.displayTitle} earlier`}
                    >
                      <ArrowUpIcon />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="icon-button"
                      onClick={() => move(item.id, 1)}
                      disabled={index === items.length - 1}
                      aria-label={`Move ${item.displayTitle} later`}
                    >
                      <ArrowDownIcon />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="icon-button"
                      onClick={() => remove(item.id)}
                      aria-label={`Remove ${item.displayTitle}`}
                    >
                      <CloseIcon />
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}

function CopyListButton({ items }: { items: SelectionItem[] }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const text = items
      .map(
        (item, index) =>
          `${String(index + 1).padStart(2, "0")}. ${item.displayTitle}${
            item.date ? ` (${item.date})` : ""
          }${item.artist ? ` by ${item.artist}` : ""} — Met Object ${item.id} (https://www.metmuseum.org/art/collection/search/${item.id})`,
      )
      .join("\n");

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
      } catch {
        // fallback
      }
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-button"
      onClick={handleCopy}
      aria-label="Copy saved works list to clipboard"
    >
      {copied ? "List copied" : "Copy list"}
    </Button>
  );
}
