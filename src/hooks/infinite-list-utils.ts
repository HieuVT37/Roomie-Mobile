export class ListResponseError extends Error {
  constructor() {
    super("Dữ liệu danh sách không hợp lệ. Vui lòng thử lại.");
    this.name = "ListResponseError";
  }
}

export interface NormalizedList<T = any> {
  items: T[];
  page: number;
  pages: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function sameListScope(left: readonly unknown[], right: readonly unknown[]) {
  return left.length === right.length && left.every((value, i) => Object.is(value, right[i]));
}

export function listItemKey(item: unknown): string | null {
  if (!isRecord(item)) return null;
  for (const value of [item.id, item._id, item.userId]) {
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

// Keep records without an ID rather than treating every missing ID as the same item.
export function mergeListItems<T>(previous: readonly T[], incoming: readonly T[]): T[] {
  const seen = new Set<string>();
  return [...previous, ...incoming].filter((item) => {
    const key = listItemKey(item);
    if (key === null) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function pageNumber(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !/^\d+$/.test(value)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

export function normalizeListResponse<T = any>(response: unknown, requestedPage = 1): NormalizedList<T> {
  let body = response;
  // Support an explicit data envelope, while rejecting unrelated successful objects.
  if (isRecord(body) && !("items" in body) && "data" in body) {
    body = body.data;
  }

  const items = Array.isArray(body) ? body : isRecord(body) ? body.items : null;
  if (!Array.isArray(items) || !items.every(isRecord)) throw new ListResponseError();

  if (Array.isArray(body) || !isRecord(body) || (body.page == null && body.pages == null)) {
    if (requestedPage !== 1) throw new ListResponseError();
    return { items: mergeListItems<T>([], items as T[]), page: 1, pages: 1 };
  }

  const page = body.page == null ? requestedPage : pageNumber(body.page);
  const pages = body.pages == null ? page : pageNumber(body.pages);
  if (page === null || pages === null) throw new ListResponseError();
  const normalizedPage = Math.max(1, page);
  if (normalizedPage !== requestedPage) throw new ListResponseError();
  return {
    items: mergeListItems<T>([], items as T[]),
    page: normalizedPage,
    pages: Math.max(normalizedPage, pages, 1),
  };
}

// One active request per list. Invalidating also prevents old finally blocks
// from ending a newer request after a filter/session change or unmount.
export function createListRequestGate() {
  let serial = 0;
  let active: number | null = null;
  return {
    begin() {
      if (active !== null) return null;
      active = ++serial;
      return active;
    },
    isBusy: () => active !== null,
    isCurrent: (ticket: number) => active === ticket,
    finish(ticket: number) {
      if (active === ticket) active = null;
    },
    invalidate() {
      serial += 1;
      active = null;
    },
  };
}

export async function runListRequest<T>(
  gate: ReturnType<typeof createListRequestGate>,
  fetch: () => Promise<T>,
  handlers: {
    resolve: (response: T) => void;
    reject: (error: unknown) => void;
    settled: () => void;
  },
) {
  const ticket = gate.begin();
  if (ticket === null) return;
  try {
    const response = await fetch();
    if (gate.isCurrent(ticket)) handlers.resolve(response);
  } catch (error) {
    if (gate.isCurrent(ticket)) handlers.reject(error);
  } finally {
    if (gate.isCurrent(ticket)) {
      try {
        handlers.settled();
      } finally {
        gate.finish(ticket);
      }
    }
  }
}
