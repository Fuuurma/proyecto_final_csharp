import type { Artwork } from "./met/normalize";

export const STORAGE_KEY = "meet-the-met.selection";
/**
 * v0 stored a bare item array and v1 wrapped it in { version, items }.
 * v2 stores per-item value/order revisions and a clear barrier so open tabs
 * can join edits without one stale full-array write erasing another tab.
 */
const SELECTION_VERSION = 2;
const LEGACY_WRITER = "legacy";
const POSITION_STEP = 1024;

export type SelectionItem = Pick<
  Artwork,
  | "id"
  | "displayTitle"
  | "artist"
  | "date"
  | "primaryImage"
  | "primaryImageSmall"
  | "imageAspectRatio"
  | "isPublicDomain"
  | "rights"
>;

/** Shared recovery rule for legacy records and the Selection view. */
export function selectionAspectRatio(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : 1;
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
    (item.isPublicDomain === null ||
      typeof item.isPublicDomain === "boolean") &&
    isNullableString(item.rights) &&
    typeof item.imageAspectRatio === "number" &&
    Number.isFinite(item.imageAspectRatio) &&
    item.imageAspectRatio > 0
  );
}

function migrateStoredItem(value: unknown): SelectionItem | null {
  if (!value || typeof value !== "object") return null;
  const item = { ...(value as Partial<SelectionItem>) };
  item.primaryImage ??= item.primaryImageSmall;
  item.imageAspectRatio = selectionAspectRatio(item.imageAspectRatio);
  item.isPublicDomain ??= null;
  item.rights ??= null;
  return isSelectionItem(item) ? item : null;
}

function migrateItems(candidates: unknown): SelectionItem[] {
  if (!Array.isArray(candidates)) return [];
  const items: SelectionItem[] = [];
  const seen = new Set<number>();
  for (const candidate of candidates) {
    const item = migrateStoredItem(candidate);
    if (item && !seen.has(item.id)) {
      seen.add(item.id);
      items.push(item);
    }
  }
  return items;
}

export type SelectionStorage = Pick<Storage, "getItem" | "setItem">;

export type SelectionRevision = { counter: number; writer: string };

export type SelectionRecord = {
  value: SelectionItem | null;
  valueRevision: SelectionRevision;
  position: number;
  positionRevision: SelectionRevision;
};

export type SelectionDocument = {
  clearRevision: SelectionRevision | null;
  records: Record<string, SelectionRecord>;
};

export function createSelectionDocument(
  items: SelectionItem[],
): SelectionDocument {
  return legacySelectionDocument(items);
}

export type SelectionIntent =
  | { type: "add"; item: SelectionItem }
  | { type: "remove"; objectId: number }
  | { type: "move"; objectId: number; direction: -1 | 1 }
  | { type: "clear" };

type ParsedSelectionDocument =
  | {
      status: "ok";
      document: SelectionDocument;
      storedVersion: number | null;
      needsUpgrade: boolean;
    }
  | { status: "unsupported-version"; version: number };

export type StoredSelectionRead = ParsedSelectionDocument & {
  raw: string | null;
};

export const emptySelectionDocument = (): SelectionDocument => ({
  clearRevision: null,
  records: {},
});

function compareRevision(
  left: SelectionRevision,
  right: SelectionRevision,
): number {
  // Lamport counter orders observed edits. Concurrent edits use the stable
  // per-tab writer id as a deterministic tie-break, independent of delivery.
  if (left.counter !== right.counter) return left.counter - right.counter;
  return left.writer < right.writer ? -1 : left.writer > right.writer ? 1 : 0;
}

function isSelectionRevision(value: unknown): value is SelectionRevision {
  if (!value || typeof value !== "object") return false;
  const revision = value as Partial<SelectionRevision>;
  return (
    Number.isSafeInteger(revision.counter) &&
    (revision.counter ?? -1) >= 0 &&
    typeof revision.writer === "string" &&
    revision.writer.length > 0
  );
}

function legacySelectionDocument(items: SelectionItem[]): SelectionDocument {
  const revision = { counter: 0, writer: LEGACY_WRITER };
  const records: SelectionDocument["records"] = {};
  items.forEach((item, index) => {
    records[String(item.id)] = {
      value: item,
      valueRevision: revision,
      position: index * POSITION_STEP,
      positionRevision: revision,
    };
  });
  return { clearRevision: null, records };
}

function itemTieBreakKey(item: SelectionItem | null): string {
  if (!item) return "null";
  return JSON.stringify([
    item.id,
    item.displayTitle,
    item.artist,
    item.date,
    item.primaryImage,
    item.primaryImageSmall,
    item.imageAspectRatio,
    item.isPublicDomain,
    item.rights,
  ]);
}

function chooseValueRecord(
  left: SelectionRecord,
  right: SelectionRecord,
): Pick<SelectionRecord, "value" | "valueRevision"> {
  const compared = compareRevision(left.valueRevision, right.valueRevision);
  if (compared > 0) {
    return { value: left.value, valueRevision: left.valueRevision };
  }
  if (compared < 0) {
    return { value: right.value, valueRevision: right.valueRevision };
  }
  if ((left.value === null) !== (right.value === null)) {
    const winner = left.value === null ? left : right;
    return { value: winner.value, valueRevision: winner.valueRevision };
  }
  const winner =
    itemTieBreakKey(left.value) <= itemTieBreakKey(right.value) ? left : right;
  return { value: winner.value, valueRevision: winner.valueRevision };
}

function choosePositionRecord(
  left: SelectionRecord,
  right: SelectionRecord,
): Pick<SelectionRecord, "position" | "positionRevision"> {
  const compared = compareRevision(
    left.positionRevision,
    right.positionRevision,
  );
  if (compared > 0) {
    return {
      position: left.position,
      positionRevision: left.positionRevision,
    };
  }
  if (compared < 0) {
    return {
      position: right.position,
      positionRevision: right.positionRevision,
    };
  }
  const winner = left.position <= right.position ? left : right;
  return {
    position: winner.position,
    positionRevision: winner.positionRevision,
  };
}

function compactSelectionDocument(
  document: SelectionDocument,
): SelectionDocument {
  const clear = document.clearRevision;
  if (!clear) return document;
  const records: SelectionDocument["records"] = {};
  for (const [id, record] of Object.entries(document.records)) {
    // The clear revision is a durable barrier against stale tabs.
    if (compareRevision(record.valueRevision, clear) > 0) {
      records[id] = record;
    }
  }
  return { clearRevision: clear, records };
}

export function mergeSelectionDocuments(
  left: SelectionDocument,
  right: SelectionDocument,
): SelectionDocument {
  const ids = new Set([
    ...Object.keys(left.records),
    ...Object.keys(right.records),
  ]);
  const records: SelectionDocument["records"] = {};
  for (const id of ids) {
    const a = left.records[id];
    const b = right.records[id];
    if (!a) {
      records[id] = b;
      continue;
    }
    if (!b) {
      records[id] = a;
      continue;
    }
    records[id] = {
      ...chooseValueRecord(a, b),
      ...choosePositionRecord(a, b),
    };
  }
  const clearRevision =
    left.clearRevision && right.clearRevision
      ? compareRevision(left.clearRevision, right.clearRevision) >= 0
        ? left.clearRevision
        : right.clearRevision
      : (left.clearRevision ?? right.clearRevision);
  return compactSelectionDocument({ clearRevision, records });
}

export function selectionDocumentItems(
  document: SelectionDocument,
): SelectionItem[] {
  const clear = document.clearRevision;
  return Object.values(document.records)
    .filter(
      (record) =>
        record.value !== null &&
        (!clear || compareRevision(record.valueRevision, clear) > 0),
    )
    .sort(
      (left, right) =>
        left.position - right.position ||
        compareRevision(left.positionRevision, right.positionRevision) ||
        (left.value?.id ?? 0) - (right.value?.id ?? 0),
    )
    .flatMap((record) => (record.value ? [record.value] : []));
}

function maximumRevision(document: SelectionDocument): SelectionRevision {
  let maximum = document.clearRevision ?? { counter: 0, writer: LEGACY_WRITER };
  for (const record of Object.values(document.records)) {
    if (compareRevision(record.valueRevision, maximum) > 0) {
      maximum = record.valueRevision;
    }
    if (compareRevision(record.positionRevision, maximum) > 0) {
      maximum = record.positionRevision;
    }
  }
  return maximum;
}

function nextRevision(
  document: SelectionDocument,
  writer: string,
): SelectionRevision {
  return { counter: maximumRevision(document).counter + 1, writer };
}

function orderSelectionDocument(
  document: SelectionDocument,
  items: SelectionItem[],
  revision: SelectionRevision,
): SelectionDocument {
  const records = { ...document.records };
  items.forEach((item, index) => {
    const previous = records[String(item.id)];
    if (!previous?.value) return;
    records[String(item.id)] = {
      ...previous,
      position: index * POSITION_STEP,
      positionRevision: revision,
    };
  });
  return { ...document, records };
}

export function applySelectionIntent(
  document: SelectionDocument,
  intent: SelectionIntent,
  writer: string,
): SelectionDocument {
  const revision = nextRevision(document, writer);
  if (intent.type === "clear") {
    return compactSelectionDocument({
      clearRevision: revision,
      records: document.records,
    });
  }
  if (intent.type === "add") {
    const items = selectionDocumentItems(document);
    const top = items.reduce((minimum, item) => {
      const position = document.records[String(item.id)]?.position ?? 0;
      return Math.min(minimum, position);
    }, 0);
    return {
      ...document,
      records: {
        ...document.records,
        [String(intent.item.id)]: {
          value: intent.item,
          valueRevision: revision,
          position: items.length === 0 ? 0 : top - POSITION_STEP,
          positionRevision: revision,
        },
      },
    };
  }
  if (intent.type === "remove") {
    const id = String(intent.objectId);
    const previous = document.records[id];
    return {
      ...document,
      records: {
        ...document.records,
        [id]: {
          value: null,
          valueRevision: revision,
          position: previous?.position ?? 0,
          positionRevision: previous?.positionRevision ?? revision,
        },
      },
    };
  }

  const items = selectionDocumentItems(document);
  const index = items.findIndex((item) => item.id === intent.objectId);
  const nextIndex = index + intent.direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= items.length) return document;
  const reordered = [...items];
  const [moved] = reordered.splice(index, 1);
  if (!moved) return document;
  reordered.splice(nextIndex, 0, moved);
  return orderSelectionDocument(document, reordered, revision);
}

export function parseSelectionDocument(
  raw: string | null,
): ParsedSelectionDocument {
  if (!raw) {
    return {
      status: "ok",
      document: emptySelectionDocument(),
      storedVersion: null,
      needsUpgrade: false,
    };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      status: "ok",
      document: emptySelectionDocument(),
      storedVersion: null,
      needsUpgrade: false,
    };
  }

  const version = Array.isArray(parsed)
    ? 0
    : parsed !== null && typeof parsed === "object"
      ? (parsed as { version?: unknown }).version
      : undefined;
  if (typeof version !== "number") {
    return {
      status: "ok",
      document: emptySelectionDocument(),
      storedVersion: null,
      needsUpgrade: false,
    };
  }
  if (
    !Number.isSafeInteger(version) ||
    version < 0 ||
    version > SELECTION_VERSION
  ) {
    return { status: "unsupported-version", version };
  }
  if (version < SELECTION_VERSION) {
    const legacy = Array.isArray(parsed)
      ? { items: parsed }
      : (parsed as { items?: unknown });
    return {
      status: "ok",
      document: legacySelectionDocument(migrateItems(legacy.items)),
      storedVersion: version,
      needsUpgrade: true,
    };
  }

  const stored = parsed as { clearRevision?: unknown; records?: unknown };
  const records: SelectionDocument["records"] = {};
  if (stored.records && typeof stored.records === "object") {
    for (const [id, candidate] of Object.entries(stored.records)) {
      if (!candidate || typeof candidate !== "object") continue;
      const record = candidate as Partial<SelectionRecord>;
      const objectId = Number(id);
      if (
        !Number.isSafeInteger(objectId) ||
        objectId < 0 ||
        !isSelectionRevision(record.valueRevision) ||
        !isSelectionRevision(record.positionRevision) ||
        typeof record.position !== "number" ||
        !Number.isFinite(record.position)
      ) {
        continue;
      }
      const value =
        record.value === null ? null : migrateStoredItem(record.value);
      if (record.value !== null && !value) continue;
      if (value && value.id !== objectId) continue;
      records[id] = {
        value,
        valueRevision: record.valueRevision,
        position: record.position,
        positionRevision: record.positionRevision,
      };
    }
  }
  return {
    status: "ok",
    document: compactSelectionDocument({
      clearRevision: isSelectionRevision(stored.clearRevision)
        ? stored.clearRevision
        : null,
      records,
    }),
    storedVersion: version,
    needsUpgrade: false,
  };
}

export function serializeSelectionDocument(
  document: SelectionDocument,
): string {
  const records = Object.fromEntries(
    Object.keys(document.records)
      .sort((left, right) => Number(left) - Number(right))
      .map((id) => {
        const record = document.records[id];
        return [
          id,
          {
            value: record.value,
            valueRevision: record.valueRevision,
            position: record.position,
            positionRevision: record.positionRevision,
          },
        ];
      }),
  );
  return JSON.stringify({
    version: SELECTION_VERSION,
    clearRevision: document.clearRevision,
    records,
  });
}

export function readStoredDocument(
  storage: SelectionStorage,
): StoredSelectionRead {
  const raw = storage.getItem(STORAGE_KEY);
  return { ...parseSelectionDocument(raw), raw };
}

export function itemListsEqual(
  left: SelectionItem[],
  right: SelectionItem[],
): boolean {
  return (
    left.length === right.length &&
    left.every(
      (item, index) =>
        itemTieBreakKey(item) === itemTieBreakKey(right[index] ?? null),
    )
  );
}

function documentForSnapshot(
  document: SelectionDocument,
  items: SelectionItem[],
  writer: string,
): SelectionDocument {
  const currentItems = selectionDocumentItems(document);
  if (items.length === 0 && currentItems.length > 0) {
    return applySelectionIntent(document, { type: "clear" }, writer);
  }
  let next = document;
  const wanted = new Set(items.map((item) => item.id));
  for (const item of currentItems) {
    if (!wanted.has(item.id)) {
      next = applySelectionIntent(
        next,
        { type: "remove", objectId: item.id },
        writer,
      );
    }
  }
  const currentById = new Map(
    selectionDocumentItems(next).map((item) => [item.id, item]),
  );
  for (const item of items) {
    const previous = currentById.get(item.id);
    if (!previous || itemTieBreakKey(previous) !== itemTieBreakKey(item)) {
      next = applySelectionIntent(next, { type: "add", item }, writer);
    }
  }
  const now = selectionDocumentItems(next);
  if (
    now.length !== items.length ||
    now.some((item, index) => item.id !== items[index]?.id)
  ) {
    next = orderSelectionDocument(next, items, nextRevision(next, writer));
  }
  return next;
}

export type ParsedStoredSelection =
  | { status: "ok"; items: SelectionItem[] }
  | { status: "unsupported-version"; version: number };

/** Parses v0/v1 storage and the mergeable v2 selection document. */
export function parseStoredSelection(
  raw: string | null,
): ParsedStoredSelection {
  const parsed = parseSelectionDocument(raw);
  return parsed.status === "ok"
    ? { status: "ok", items: selectionDocumentItems(parsed.document) }
    : parsed;
}

export function localStorageOrNull(): SelectionStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function createWriterId(): string {
  try {
    return window.crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }
}

export function readSelection(storage: SelectionStorage): SelectionItem[] {
  try {
    const stored = readStoredDocument(storage);
    return stored.status === "ok"
      ? selectionDocumentItems(stored.document)
      : [];
  } catch {
    return [];
  }
}

export type PersistSelectionResult =
  | { status: "persisted" }
  | { status: "blocked"; reason: "unsupported-version"; version: number }
  | { status: "blocked"; reason: "unavailable" };

export function writeSelectionDocument(
  storage: SelectionStorage,
  document: SelectionDocument,
  currentRaw: string | null,
): PersistSelectionResult {
  try {
    if (
      currentRaw === null &&
      Object.keys(document.records).length === 0 &&
      document.clearRevision === null
    ) {
      return { status: "persisted" };
    }
    const serialized = serializeSelectionDocument(document);
    if (serialized !== currentRaw) storage.setItem(STORAGE_KEY, serialized);
    return { status: "persisted" };
  } catch {
    return { status: "blocked", reason: "unavailable" };
  }
}

export function persistSelection(
  storage: SelectionStorage,
  items: SelectionItem[],
): PersistSelectionResult {
  try {
    const stored = readStoredDocument(storage);
    if (stored.status === "unsupported-version") {
      console.warn(
        `[selection] stored payload has version ${stored.version}, which this build cannot read; keeping it on disk and skipping this write`,
      );
      return {
        status: "blocked",
        reason: "unsupported-version",
        version: stored.version,
      };
    }
    const document = documentForSnapshot(
      stored.document,
      items,
      "direct-write",
    );
    return writeSelectionDocument(storage, document, stored.raw);
  } catch {
    return { status: "blocked", reason: "unavailable" };
  }
}
