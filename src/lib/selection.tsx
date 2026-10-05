import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type { Artwork } from "./met/normalize";

import {
  applySelectionIntent,
  createWriterId,
  emptySelectionDocument,
  itemListsEqual,
  localStorageOrNull,
  mergeSelectionDocuments,
  parseSelectionDocument,
  readStoredDocument,
  type SelectionDocument,
  type SelectionIntent,
  type SelectionItem,
  STORAGE_KEY,
  type StoredSelectionRead,
  selectionAspectRatio,
  selectionDocumentItems,
  writeSelectionDocument,
} from "./selection-storage";

export * from "./selection-storage";

type SelectionContextValue = {
  items: SelectionItem[];
  isHydrated: boolean;
  announcement: string;
  /**
   * Why a save cannot persist, or null when writes land normally.
   * "unsupported-version": a newer build's envelope owns the storage
   * key — writes are refused so the foreign payload survives.
   * "unavailable": the store itself refuses (private mode, quota, a
   * throwing accessor) — saves die the same silent death, so it must
   * be disclosed distinctly, not coerced to unblocked (review 09-19
   * P1; review 09-19 18:17 P2).
   */
  persistenceBlocked: "unsupported-version" | "unavailable" | null;
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
    // Stored selections made before this field existed fall back to the
    // small asset; new ones carry the large URL for size="large" views.
    primaryImage: item.primaryImage ?? item.primaryImageSmall,
    primaryImageSmall: item.primaryImageSmall,
    additionalImages: [],
    imageAspectRatio: selectionAspectRatio(item.imageAspectRatio),
    isPublicDomain: item.isPublicDomain,
    rights: item.rights,
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
    isPublicDomain: artwork.isPublicDomain,
    rights: artwork.rights,
  };
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
  | { type: "replace"; items: SelectionItem[]; announcement?: string }
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
    case "replace":
      return {
        ...state,
        items: action.items,
        announcement: action.announcement ?? state.announcement,
      };
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

// Documents are only ever replaced, never mutated in place — so the
// ref's initial value can be a module constant instead of a factory
// call re-evaluated on every render (react-doctor
// rerender-lazy-ref-init). Same sharing as emptySelectionState above.
const INITIAL_SELECTION_DOCUMENT = emptySelectionDocument();

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(selectionReducer, emptySelectionState);
  const { items, announcement } = state;
  const stateRef = useRef(state);
  const documentRef = useRef<SelectionDocument>(INITIAL_SELECTION_DOCUMENT);
  const writerRef = useRef("");
  const pendingIntentsRef = useRef<SelectionIntent[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [persistenceBlocked, setPersistenceBlocked] =
    useState<SelectionContextValue["persistenceBlocked"]>(null);

  useEffect(() => {
    writerRef.current ||= createWriterId();
    const announceExternalItems = (document: SelectionDocument) => {
      const nextItems = selectionDocumentItems(document);
      if (itemListsEqual(stateRef.current.items, nextItems)) return;
      const action: SelectionAction = {
        type: "replace",
        items: nextItems,
        announcement: "Selection updated from another tab",
      };
      stateRef.current = selectionReducer(stateRef.current, action);
      dispatch(action);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY && event.key !== null) return;
      const storage = localStorageOrNull();
      if (
        storage &&
        event.storageArea &&
        event.storageArea !== window.localStorage
      ) {
        return;
      }

      const eventValue = parseSelectionDocument(event.newValue);
      let next = documentRef.current;
      let stored: StoredSelectionRead | null = null;
      if (storage) {
        try {
          stored = readStoredDocument(storage);
        } catch {
          setPersistenceBlocked("unavailable");
        }
      } else {
        setPersistenceBlocked("unavailable");
      }

      if (stored?.status === "unsupported-version") {
        setPersistenceBlocked("unsupported-version");
        return;
      }
      if (eventValue.status === "unsupported-version" && !stored) {
        setPersistenceBlocked("unsupported-version");
        return;
      }

      // A queued storage event can arrive after a newer write. Read the
      // current key and treat a still-missing key as the winning clear, so
      // delayed old values cannot resurrect a removed selection.
      if (
        stored?.status === "ok" &&
        stored.raw === null &&
        event.newValue !== null
      ) {
        next = applySelectionIntent(next, { type: "clear" }, writerRef.current);
      } else {
        if (eventValue.status === "ok") {
          next = mergeSelectionDocuments(next, eventValue.document);
        }
        if (stored?.status === "ok") {
          next = mergeSelectionDocuments(next, stored.document);
        }
        if (
          event.newValue === null &&
          (!stored || (stored.status === "ok" && stored.raw === null))
        ) {
          next = applySelectionIntent(
            next,
            { type: "clear" },
            writerRef.current,
          );
        }
      }

      documentRef.current = next;
      if (storage && stored?.status === "ok") {
        const result = writeSelectionDocument(storage, next, stored.raw);
        setPersistenceBlocked(
          result.status === "blocked" ? result.reason : null,
        );
      }
      announceExternalItems(next);
    };

    window.addEventListener("storage", handleStorage);
    const storage = localStorageOrNull();
    if (!storage) {
      // The accessor itself is blocked — every save is a no-op from the
      // first render, so the unavailable state must be disclosed at
      // mount, not after the first doomed write (review 09-19 18:17 P2).
      setPersistenceBlocked("unavailable");
      const action: SelectionAction = { type: "hydrate", items: [] };
      stateRef.current = selectionReducer(stateRef.current, action);
      dispatch(action);
      setIsHydrated(true);
      return () => window.removeEventListener("storage", handleStorage);
    }
    let stored: StoredSelectionRead;
    try {
      stored = readStoredDocument(storage);
    } catch {
      setPersistenceBlocked("unavailable");
      const action: SelectionAction = { type: "hydrate", items: [] };
      stateRef.current = selectionReducer(stateRef.current, action);
      dispatch(action);
      setIsHydrated(true);
      return () => window.removeEventListener("storage", handleStorage);
    }
    if (stored.status === "unsupported-version") {
      setPersistenceBlocked("unsupported-version");
      const action: SelectionAction = { type: "hydrate", items: [] };
      stateRef.current = selectionReducer(stateRef.current, action);
      dispatch(action);
    } else {
      documentRef.current = stored.document;
      const action: SelectionAction = {
        type: "hydrate",
        items: selectionDocumentItems(stored.document),
      };
      stateRef.current = selectionReducer(stateRef.current, action);
      dispatch(action);
      if (stored.needsUpgrade) {
        try {
          const latest = readStoredDocument(storage);
          if (latest.status === "unsupported-version") {
            setPersistenceBlocked("unsupported-version");
          } else {
            const merged = mergeSelectionDocuments(
              documentRef.current,
              latest.document,
            );
            documentRef.current = merged;
            const result = writeSelectionDocument(storage, merged, latest.raw);
            setPersistenceBlocked(
              result.status === "blocked" ? result.reason : null,
            );
          }
        } catch {
          setPersistenceBlocked("unavailable");
        }
      }
    }
    setIsHydrated(true);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    const intents = pendingIntentsRef.current.splice(0);
    if (intents.length === 0) return;
    const storage = localStorageOrNull();
    let next = documentRef.current;
    if (storage) {
      try {
        const stored = readStoredDocument(storage);
        if (stored.status === "ok") {
          next = mergeSelectionDocuments(next, stored.document);
          for (const intent of intents) {
            next = applySelectionIntent(next, intent, writerRef.current);
          }
          documentRef.current = next;
          const result = writeSelectionDocument(storage, next, stored.raw);
          setPersistenceBlocked(
            result.status === "blocked" ? result.reason : null,
          );
          if (result.status === "persisted") {
            pendingIntentsRef.current = [];
          }
        } else {
          for (const intent of intents) {
            next = applySelectionIntent(next, intent, writerRef.current);
          }
          documentRef.current = next;
          setPersistenceBlocked("unsupported-version");
          console.warn(
            `[selection] stored payload has version ${stored.version}, which this build cannot read; keeping it on disk and skipping this write`,
          );
        }
      } catch {
        for (const intent of intents) {
          next = applySelectionIntent(next, intent, writerRef.current);
        }
        documentRef.current = next;
        setPersistenceBlocked("unavailable");
      }
    } else {
      for (const intent of intents) {
        next = applySelectionIntent(next, intent, writerRef.current);
      }
      documentRef.current = next;
      setPersistenceBlocked("unavailable");
    }

    const reconciledItems = selectionDocumentItems(next);
    if (
      !itemListsEqual(items, reconciledItems) ||
      !itemListsEqual(stateRef.current.items, reconciledItems)
    ) {
      const action: SelectionAction = {
        type: "replace",
        items: reconciledItems,
        announcement: stateRef.current.announcement,
      };
      stateRef.current = selectionReducer(stateRef.current, action);
      dispatch(action);
    }
  }, [isHydrated, items]);

  const has = useCallback(
    (objectId: number) => items.some((item) => item.id === objectId),
    [items],
  );

  const dispatchLocal = useCallback(
    (action: SelectionAction, intent: SelectionIntent) => {
      const previous = stateRef.current;
      const next = selectionReducer(previous, action);
      if (next.items !== previous.items) pendingIntentsRef.current.push(intent);
      stateRef.current = next;
      dispatch(action);
    },
    [],
  );

  const toggle = useCallback(
    (artwork: Artwork) => {
      const saved = stateRef.current.items.some(
        (item) => item.id === artwork.id,
      );
      const item = selectionItemFromArtwork(artwork);
      dispatchLocal(
        { type: "toggle", artwork },
        saved
          ? { type: "remove", objectId: artwork.id }
          : { type: "add", item },
      );
    },
    [dispatchLocal],
  );

  const remove = useCallback(
    (objectId: number) => {
      dispatchLocal({ type: "remove", objectId }, { type: "remove", objectId });
    },
    [dispatchLocal],
  );

  const move = useCallback(
    (objectId: number, direction: -1 | 1) => {
      dispatchLocal(
        { type: "move", objectId, direction },
        { type: "move", objectId, direction },
      );
    },
    [dispatchLocal],
  );

  const clear = useCallback(() => {
    dispatchLocal({ type: "clear" }, { type: "clear" });
  }, [dispatchLocal]);

  const value = useMemo(
    () => ({
      items,
      isHydrated,
      announcement,
      persistenceBlocked,
      has,
      toggle,
      remove,
      move,
      clear,
    }),
    [
      announcement,
      clear,
      has,
      isHydrated,
      items,
      move,
      persistenceBlocked,
      remove,
      toggle,
    ],
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
