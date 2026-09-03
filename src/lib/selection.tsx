import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Artwork } from "./met/normalize";

const STORAGE_KEY = "meet-the-met.selection";

export type SelectionItem = Pick<
  Artwork,
  | "id"
  | "displayTitle"
  | "artist"
  | "date"
  | "primaryImageSmall"
  | "imageAspectRatio"
>;

type SelectionContextValue = {
  items: SelectionItem[];
  isHydrated: boolean;
  announcement: string;
  has: (objectId: number) => boolean;
  toggle: (artwork: Artwork) => void;
  remove: (objectId: number) => void;
  move: (objectId: number, direction: -1 | 1) => void;
  clear: () => void;
};

const SelectionContext = createContext<SelectionContextValue | null>(null);

export function moveSelectionItem(
  items: SelectionItem[],
  objectId: number,
  direction: -1 | 1,
): SelectionItem[] {
  const index = items.findIndex((item) => item.id === objectId);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= items.length) {
    return items;
  }

  const next = [...items];
  const [moved] = next.splice(index, 1);
  if (!moved) return items;
  next.splice(nextIndex, 0, moved);
  return next;
}

export function artworkFromSelectionItem(item: SelectionItem): Artwork {
  return {
    id: item.id,
    accessionNumber: null,
    title: item.displayTitle,
    displayTitle: item.displayTitle,
    artist: item.artist,
    artistBio: null,
    date: item.date,
    culture: null,
    period: null,
    medium: null,
    dimensions: null,
    department: null,
    classification: null,
    primaryImage: item.primaryImageSmall,
    primaryImageSmall: item.primaryImageSmall,
    additionalImages: [],
    imageAspectRatio:
      typeof item.imageAspectRatio === "number" && item.imageAspectRatio > 0
        ? item.imageAspectRatio
        : 1,
    isPublicDomain: true,
    rights: null,
    creditLine: null,
    canonicalUrl: `https://www.metmuseum.org/art/collection/search/${item.id}`,
    tags: [],
  };
}

export function selectionItemFromArtwork(artwork: Artwork): SelectionItem {
  return {
    id: artwork.id,
    displayTitle: artwork.displayTitle,
    artist: artwork.artist,
    date: artwork.date,
    primaryImageSmall: artwork.primaryImageSmall,
    imageAspectRatio: artwork.imageAspectRatio,
  };
}

function isSelectionItem(value: unknown): value is SelectionItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<SelectionItem>;
  return typeof item.id === "number" && typeof item.displayTitle === "string";
}

function readSelection(): SelectionItem[] {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.filter(isSelectionItem) : [];
  } catch {
    return [];
  }
}

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<SelectionItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    setItems((current) => (current.length > 0 ? current : readSelection()));
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [isHydrated, items]);

  const has = useCallback(
    (objectId: number) => items.some((item) => item.id === objectId),
    [items],
  );

  const toggle = useCallback(
    (artwork: Artwork) => {
      const alreadySaved = items.some((item) => item.id === artwork.id);
      setAnnouncement(
        alreadySaved
          ? `Removed ${artwork.displayTitle} from your selection`
          : `Saved ${artwork.displayTitle} to your selection`,
      );
      setItems((current) =>
        alreadySaved
          ? current.filter((item) => item.id !== artwork.id)
          : [selectionItemFromArtwork(artwork), ...current],
      );
    },
    [items],
  );

  const remove = useCallback(
    (objectId: number) => {
      const removed = items.find((item) => item.id === objectId);
      if (removed) {
        setAnnouncement(`Removed ${removed.displayTitle} from your selection`);
      }
      setItems((current) => current.filter((item) => item.id !== objectId));
    },
    [items],
  );

  const move = useCallback((objectId: number, direction: -1 | 1) => {
    setItems((current) => moveSelectionItem(current, objectId, direction));
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    setAnnouncement("Cleared the local selection");
  }, []);

  const value = useMemo(
    () => ({
      items,
      isHydrated,
      announcement,
      has,
      toggle,
      remove,
      move,
      clear,
    }),
    [announcement, clear, has, isHydrated, items, move, remove, toggle],
  );

  return (
    <SelectionContext.Provider value={value}>
      {children}
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </SelectionContext.Provider>
  );
}

export function useSelection(): SelectionContextValue {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error("useSelection must be used inside SelectionProvider");
  }
  return context;
}
