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

export const STORAGE_KEY = "meet-the-met.selection";
/**
 * Stored-payload schema version. v0 wrote a bare SelectionItem[]; v1 wraps
 * it in { version, items } so a future required-field addition can migrate
 * instead of silently dropping the whole selection (needs-work 09-05).
 */
const SELECTION_VERSION = 1;

export type SelectionItem = Pick<
  Artwork,
  | "id"
  | "displayTitle"
  | "artist"
  | "date"
  | "primaryImage"
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

/**
 * Single recovery policy for a missing or corrupt stored ratio: default to
 * 1. migrateStoredItem and artworkFromSelectionItem share it so a stored
 * item is never recovered differently at parse time vs rebuild time
 * (review 09-14 P3).
 */
function selectionAspectRatio(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : 1;
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
    // Stored selections made before this field existed fall back to the
    // small asset; new ones carry the large URL for size="large" views.
    primaryImage: item.primaryImage ?? item.primaryImageSmall,
    primaryImageSmall: item.primaryImageSmall,
    additionalImages: [],
    imageAspectRatio: selectionAspectRatio(item.imageAspectRatio),
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
    primaryImage: artwork.primaryImage,
    primaryImageSmall: artwork.primaryImageSmall,
    imageAspectRatio: artwork.imageAspectRatio,
  };
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isSelectionItem(value: unknown): value is SelectionItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<SelectionItem>;
  return (
    typeof item.id === "number" &&
    typeof item.displayTitle === "string" &&
    isNullableString(item.artist) &&
    isNullableString(item.date) &&
    isNullableString(item.primaryImage) &&
    isNullableString(item.primaryImageSmall) &&
    typeof item.imageAspectRatio === "number" &&
    Number.isFinite(item.imageAspectRatio) &&
    item.imageAspectRatio > 0
  );
}

function migrateStoredItem(value: unknown): SelectionItem | null {
  if (!value || typeof value !== "object") return null;
  const item = { ...(value as Partial<SelectionItem>) };
  // primaryImage joined the stored shape after launch — fill it from the
  // small asset, the same fallback artworkFromSelectionItem applies.
  item.primaryImage ??= item.primaryImageSmall;
  item.imageAspectRatio = selectionAspectRatio(item.imageAspectRatio);
  return isSelectionItem(item) ? item : null;
}

function migrateItems(candidates: unknown): SelectionItem[] {
  if (!Array.isArray(candidates)) return [];
  const items: SelectionItem[] = [];
  const seen = new Set<number>();
  for (const candidate of candidates) {
    const item = migrateStoredItem(candidate);
    // Duplicated ids produce duplicate React keys and divergent remove-all
    // vs move/has behavior — keep only the first stored copy.
    if (item && !seen.has(item.id)) {
      seen.add(item.id);
      items.push(item);
    }
  }
  return items;
}

function readEnvelopeItems(stored: unknown): SelectionItem[] {
  return migrateItems(
    stored !== null && typeof stored === "object"
      ? (stored as { items?: unknown }).items
      : undefined,
  );
}

/**
 * Migration table: key = stored `version`, value = reader that turns that
 * payload shape into current items. v0 is the pre-envelope bare array,
 * normalized to { items } before dispatch. Add a reader for every new
 * SELECTION_VERSION so older payloads keep loading; a stored version with
 * no reader belongs to a newer build and must never be re-stamped over
 * (review 09-14 P1). Partial keeps "no reader" inside the type system —
 * without it, indexing claimed every version had a reader and tsc could
 * not see the unsupported-version fallback (review 09-14 P3).
 */
const SELECTION_MIGRATIONS: Partial<
  Record<number, (stored: unknown) => SelectionItem[]>
> = {
  0: readEnvelopeItems,
  1: readEnvelopeItems,
};

/**
 * Read result for the stored payload. "ok" carries usable items (possibly
 * empty); "unsupported-version" means a newer build owns the payload — it
 * hydrates nothing here and is never clobbered.
 */
export type ParsedStoredSelection =
  | { status: "ok"; items: SelectionItem[] }
  | { status: "unsupported-version"; version: number };

/** Parses the raw localStorage payload, dispatching on `version`. */
export function parseStoredSelection(
  raw: string | null,
): ParsedStoredSelection {
  if (!raw) return { status: "ok", items: [] };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: "ok", items: [] };
  }
  const version = Array.isArray(parsed)
    ? 0
    : parsed !== null && typeof parsed === "object"
      ? (parsed as { version?: unknown }).version
      : undefined;
  if (typeof version !== "number") return { status: "ok", items: [] };
  const stored = Array.isArray(parsed) ? { items: parsed } : parsed;
  const migrate = SELECTION_MIGRATIONS[version];
  return migrate
    ? { status: "ok", items: migrate(stored) }
    : { status: "unsupported-version", version };
}

type SelectionStorage = Pick<Storage, "getItem" | "setItem">;

function localStorageOrNull(): SelectionStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readSelection(storage: SelectionStorage): SelectionItem[] {
  try {
    const stored = parseStoredSelection(storage.getItem(STORAGE_KEY));
    // A newer build's envelope hydrates nothing here but stays on disk
    // for the version that can read it.
    return stored.status === "ok" ? stored.items : [];
  } catch {
    return [];
  }
}

export function persistSelection(
  storage: SelectionStorage,
  items: SelectionItem[],
): void {
  try {
    // Never re-stamp over an unsupported-version payload: this build
    // cannot represent it, and overwriting would destroy data a future
    // migration could still recover (review 09-14 P1). The refusal must
    // not be silent — saves and clears no-op while the newer payload is
    // preserved (review 09-14 P3).
    // TODO: surface a "selection changes are not being saved" notice in
    // the tray while an unsupported-version payload owns the key.
    const stored = parseStoredSelection(storage.getItem(STORAGE_KEY));
    if (stored.status === "unsupported-version") {
      console.warn(
        `[selection] stored payload has version ${stored.version}, which this build cannot read; keeping it on disk and skipping this write`,
      );
      return;
    }
    // An empty selection on a key-less storage stays key-less: writing
    // here would stamp {"items":[]} for every first-time visitor and
    // erase the no-key vs empty-selection distinction (needs-work
    // 09-15 06:16 P3). Pre-existing keys still update (clearing the
    // last item must persist).
    if (items.length === 0 && storage.getItem(STORAGE_KEY) === null) {
      return;
    }
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: SELECTION_VERSION, items }),
    );
  } catch {
    // Private mode / quota-exceeded: the in-memory tray keeps working,
    // persistence just degrades for this visit. Mirrors readSelection's
    // guard (devin 09-09 14:17 #4 — the write was the unguarded half).
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
    case "hydrate": {
      if (state.items.length === 0) return { ...state, items: action.items };
      // Pre-hydration edits landed — merge instead of dropping either
      // side (needs-work 09-15 00:01 P3: the old guard discarded the
      // stored payload wholesale once any item existed). Stored
      // uniques keep their order behind the live edits.
      const existing = new Set(state.items.map((i) => i.id));
      const storedNew = action.items.filter((i) => !existing.has(i.id));
      return { ...state, items: [...state.items, ...storedNew] };
    }
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
    case "move": {
      // Announce only real moves: at either edge moveSelectionItem
      // returns the array unchanged, and announcing "Moved X later" for
      // a no-op lied about the outcome (devin 09-09 16:57 #3).
      const previousIndex = state.items.findIndex(
        (item) => item.id === action.objectId,
      );
      const moved = moveSelectionItem(
        state.items,
        action.objectId,
        action.direction,
      );
      const nextIndex = moved.findIndex((item) => item.id === action.objectId);
      const actuallyMoved = previousIndex !== -1 && previousIndex !== nextIndex;
      const movedItem = moved[nextIndex] ?? state.items[previousIndex];
      return {
        items: moved,
        announcement:
          actuallyMoved && movedItem
            ? `Moved ${movedItem.displayTitle} ${action.direction === 1 ? "later" : "earlier"}`
            : state.announcement,
      };
    }
    case "clear":
      return { items: [], announcement: "Cleared the local selection" };
  }
}

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(selectionReducer, emptySelectionState);
  const { items, announcement } = state;
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const storage = localStorageOrNull();
    dispatch({
      type: "hydrate",
      items: storage ? readSelection(storage) : [],
    });
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    const storage = localStorageOrNull();
    if (storage) persistSelection(storage, items);
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
