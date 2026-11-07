export type QueuedHeadcount = {
  readonly churchId: string;
  readonly serviceId: string;
  readonly counts: Readonly<Record<string, number>>;
  readonly savedAt: string;
};

const STORAGE_KEY = "ecclesia.headcounts.v1";
export const QUEUE_EVENT = "ecclesia:headcounts-changed";

type Store = Record<string, QueuedHeadcount>;

const keyFor = (churchId: string, serviceId: string) => `${churchId}:${serviceId}`;

const isQueued = (value: unknown): value is QueuedHeadcount => {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.churchId === "string" &&
    typeof entry.serviceId === "string" &&
    typeof entry.savedAt === "string" &&
    typeof entry.counts === "object" &&
    entry.counts !== null &&
    Object.values(entry.counts).every((n) => Number.isInteger(n) && (n as number) >= 0)
  );
};

const readStore = (): Store => {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    if (typeof parsed !== "object" || parsed === null) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([, value]) => isQueued(value)));
  } catch {
    return {};
  }
};

const writeStore = (store: Store): boolean => {
  try {
    if (Object.keys(store).length === 0) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    window.dispatchEvent(new Event(QUEUE_EVENT));
    return true;
  } catch {
    return false;
  }
};

export const queueHeadcount = (entry: Omit<QueuedHeadcount, "savedAt">): boolean =>
  writeStore({
    ...readStore(),
    [keyFor(entry.churchId, entry.serviceId)]: { ...entry, savedAt: new Date().toISOString() },
  });

export const queuedHeadcount = (churchId: string, serviceId: string): QueuedHeadcount | null =>
  readStore()[keyFor(churchId, serviceId)] ?? null;

export const queuedHeadcounts = (churchId: string): QueuedHeadcount[] =>
  Object.values(readStore())
    .filter((entry) => entry.churchId === churchId)
    .sort((a, b) => a.savedAt.localeCompare(b.savedAt));

export const clearQueuedHeadcount = (churchId: string, serviceId: string, savedAt?: string) => {
  const store = readStore();
  const key = keyFor(churchId, serviceId);
  if (!store[key] || (savedAt && store[key].savedAt !== savedAt)) return;
  delete store[key];
  writeStore(store);
};

export const headcountFormData = (serviceId: string, counts: Readonly<Record<string, number>>) => {
  const data = new FormData();
  data.set("serviceId", serviceId);
  for (const [categoryId, count] of Object.entries(counts))
    data.set(`count:${categoryId}`, String(count));
  return data;
};

export const isNetworkFailure = (error: unknown) =>
  error instanceof TypeError || (typeof navigator !== "undefined" && !navigator.onLine);
