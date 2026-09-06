import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
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

/**
 * Items and announcement live in ONE reducer state: every action derives
 * its announcement from the state it is transforming, so the live region
 * can never describe a selection other than the one just committed
 * (grok 09-05: stale-closure toggle announced the opposite of what it
 * did, and a rapid double-toggle left the item stuck in the selection).
 */
export type SelectionState = { items: SelectionItem[]; announcement: string };

export type SelectionAction =
  | { type: "hydrate"; items: SelectionItem[] }
  | { type: "toggle"; artwork: Artwork }
  | { type: "remove"; objectId: number }
  | { type: "move"; objectId: number; direction: -1 | 1 }
  | { type: "clear" };

export const emptySelectionState: SelectionState = {
  items: [],
  announcement: "",
};

export function selectionReducer(
  state: SelectionState,
  action: SelectionAction,
): SelectionState {
  switch (action.type) {
    case "hydrate":
      return state.items.length > 0 ? state : { ...state, items: action.items };
    case "toggle": {
      const alreadySaved = state.items.some(
        (item) => item.id === action.artwork.id,
      );
      return {
        items: alreadySaved
          ? state.items.filter((item) => item.id !== action.artwork.id)
          : [selectionItemFromArtwork(action.artwork), ...state.items],
        announcement: alreadySaved
          ? `Removed ${action.artwork.displayTitle} from your selection`
          : `Saved ${action.artwork.displayTitle} to your selection`,
      };
    }
    case "remove": {
      const removed = state.items.find((item) => item.id === action.objectId);
      return {
        items: state.items.filter((item) => item.id !== action.objectId),
        announcement: removed
          ? `Removed ${removed.displayTitle} from your selection`
          : state.announcement,
      };
    }
    case "move":
      return {
        ...state,
        items: moveSelectionItem(
          state.items,
          action.objectId,
          action.direction,
        ),
      };
    case "clear":
      return { items: [], announcement: "Cleared the local selection" };
  }
}

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(selectionReducer, emptySelectionState);
  const { items, announcement } = state;
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    dispatch({ type: "hydrate", items: readSelection() });
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

  const toggle = useCallback((artwork: Artwork) => {
    dispatch({ type: "toggle", artwork });
  }, []);

  const remove = useCallback((objectId: number) => {
    dispatch({ type: "remove", objectId });
  }, []);

  const move = useCallback((objectId: number, direction: -1 | 1) => {
    dispatch({ type: "move", objectId, direction });
  }, []);

  const clear = useCallback(() => {
    dispatch({ type: "clear" });
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
