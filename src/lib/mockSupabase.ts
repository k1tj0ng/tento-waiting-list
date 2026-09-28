import { WaitlistEntry, SeatedRecord } from "./types";

const WAITLIST_KEY = "tento_sim_queue";
const HISTORY_KEY = "tento_sim_history";
const DATE_KEY = "tento_sim_date";
const CHANNEL_NAME = "tento_sim";

// ── Daily reset ────────────────────────────────────────────────────────────
function todayStr(): string {
  return new Date().toLocaleDateString("en-AU", { timeZone: "Australia/Sydney" });
}

export function runDailyReset(): void {
  if (typeof window === "undefined") return;
  const stored = localStorage.getItem(DATE_KEY);
  const today = todayStr();
  if (stored !== today) {
    localStorage.setItem(WAITLIST_KEY, "[]");
    localStorage.setItem(HISTORY_KEY, "[]");
    localStorage.setItem(DATE_KEY, today);
  }
}

// ── Waitlist helpers ───────────────────────────────────────────────────────
function getQueue(): WaitlistEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(WAITLIST_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveQueue(q: WaitlistEntry[]) {
  localStorage.setItem(WAITLIST_KEY, JSON.stringify(q));
}

// ── Seated history helpers ─────────────────────────────────────────────────
export function getHistory(): SeatedRecord[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveHistory(h: SeatedRecord[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
}

// ── BroadcastChannel ───────────────────────────────────────────────────────
type ChangeEvent = "INSERT" | "DELETE" | "UPDATE";

function broadcast(event: ChangeEvent, table: string, row: Record<string, unknown>) {
  try {
    const bc = new BroadcastChannel(CHANNEL_NAME);
    bc.postMessage({ event, table, row });
    bc.close();
  } catch {}
}

type Listener = (payload: {
  event: ChangeEvent;
  new?: Record<string, unknown>;
  old?: Partial<Record<string, unknown>>;
}) => void;

interface ChannelFilter {
  event: ChangeEvent;
  table: string;
  filter?: string;
}

class MockChannel {
  private listeners: Array<{ filter: ChannelFilter; cb: Listener }> = [];
  private bc: BroadcastChannel | null = null;

  constructor(private name: string) {}

  on(
    _type: string,
    filter: { event: ChangeEvent; schema: string; table: string; filter?: string },
    callback: Listener
  ) {
    this.listeners.push({ filter, cb: callback });
    return this;
  }

  subscribe() {
    if (typeof window === "undefined") return this;
    this.bc = new BroadcastChannel(CHANNEL_NAME);
    this.bc.onmessage = (msg: MessageEvent) => {
      const { event, table, row } = msg.data as {
        event: ChangeEvent;
        table: string;
        row: Record<string, unknown>;
      };
      for (const { filter, cb } of this.listeners) {
        if (filter.event !== event) continue;
        if (filter.table !== table) continue;
        if (filter.filter) {
          const parts = filter.filter.split("=eq.");
          const key = parts[0]?.trim();
          const val = parts[1]?.trim();
          if (key && val && row[key] !== val) continue;
        }
        if (event === "INSERT" || event === "UPDATE") {
          cb({ event, new: row });
        } else {
          cb({ event, old: row });
        }
      }
    };
    return this;
  }

  close() {
    this.bc?.close();
    this.bc = null;
  }
}

// ── Query builder ──────────────────────────────────────────────────────────
type Operation = "insert" | "select" | "delete" | "update";
type Row = Record<string, unknown>;

class MockQueryBuilder {
  private _op: Operation = "select";
  private _data: Row | null = null;
  private _updateData: Row | null = null;
  private _eqFilters: Record<string, string> = {};
  private _neqFilters: Record<string, string> = {};
  private _orderCol: string | null = null;
  private _orderAsc = true;
  private _single = false;

  constructor(private table: string) {}

  insert(data: Row) {
    this._op = "insert";
    this._data = data;
    return this;
  }

  update(data: Row) {
    this._op = "update";
    this._updateData = data;
    return this;
  }

  select(_fields = "*") {
    if (this._op !== "insert") this._op = "select";
    return this;
  }

  delete() {
    this._op = "delete";
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this._orderCol = col;
    this._orderAsc = opts?.ascending ?? true;
    return this;
  }

  eq(col: string, val: string) {
    this._eqFilters[col] = val;
    return this;
  }

  neq(col: string, val: string) {
    this._neqFilters[col] = val;
    return this;
  }

  single() {
    this._single = true;
    return this;
  }

  then(resolve: (result: { data: Row | Row[] | null; error: null }) => void) {
    Promise.resolve().then(() => resolve(this._execute()));
  }

  private _sorted(rows: Row[]): Row[] {
    if (!this._orderCol) return rows;
    const col = this._orderCol;
    const asc = this._orderAsc;
    return [...rows].sort((a, b) => {
      const av = String(a[col] ?? "");
      const bv = String(b[col] ?? "");
      return asc ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }

  private _applyEqFilters(rows: Row[]): Row[] {
    let result = rows;
    for (const [col, val] of Object.entries(this._eqFilters)) {
      result = result.filter((r) => String(r[col]) === val);
    }
    return result;
  }

  private _execute(): { data: Row | Row[] | null; error: null } {
    // ── INSERT ──────────────────────────────────────────────────────────────
    if (this._op === "insert") {
      if (this.table === "waitlist") {
        const entry: WaitlistEntry = {
          id: crypto.randomUUID(),
          name: (this._data?.name as string) ?? "",
          group_size: (this._data?.group_size as number) ?? 1,
          phone: (this._data?.phone as string) ?? "",
          status: "waiting",
          created_at: new Date().toISOString(),
        };
        const q = getQueue();
        q.push(entry);
        saveQueue(q);
        broadcast("INSERT", "waitlist", entry as unknown as Row);
        return { data: this._single ? (entry as unknown as Row) : [entry as unknown as Row], error: null };
      }

      if (this.table === "seated_history") {
        const record = { ...this._data } as unknown as SeatedRecord;
        const h = getHistory();
        h.push(record);
        saveHistory(h);
        broadcast("INSERT", "seated_history", record as unknown as Row);
        return { data: this._single ? (record as unknown as Row) : [record as unknown as Row], error: null };
      }

      return { data: null, error: null };
    }

    // ── DELETE ──────────────────────────────────────────────────────────────
    if (this._op === "delete") {
      if (this.table === "waitlist") {
        let queue = getQueue();
        const removed: WaitlistEntry[] = [];
        queue = queue.filter((e) => {
          const idVal = this._eqFilters["id"];
          const neqIdVal = this._neqFilters["id"];
          const keep = idVal ? e.id !== idVal : neqIdVal ? e.id === neqIdVal : false;
          if (!keep) removed.push(e);
          return keep;
        });
        saveQueue(queue);
        for (const r of removed) {
          broadcast("DELETE", "waitlist", r as unknown as Row);
        }
        return { data: null, error: null };
      }

      if (this.table === "seated_history") {
        let history = getHistory();
        history = history.filter((r) => {
          const idVal = this._eqFilters["id"];
          const neqIdVal = this._neqFilters["id"];
          return idVal ? r.id !== idVal : neqIdVal ? r.id === neqIdVal : false;
        });
        saveHistory(history);
        return { data: null, error: null };
      }

      return { data: null, error: null };
    }

    // ── UPDATE ──────────────────────────────────────────────────────────────
    if (this._op === "update") {
      if (this.table === "waitlist") {
        let queue = getQueue();
        const updated: WaitlistEntry[] = [];
        queue = queue.map((e) => {
          const idVal = this._eqFilters["id"];
          if (idVal && e.id === idVal) {
            const newEntry = { ...e, ...this._updateData } as WaitlistEntry;
            updated.push(newEntry);
            return newEntry;
          }
          return e;
        });
        saveQueue(queue);
        for (const r of updated) {
          broadcast("UPDATE", "waitlist", r as unknown as Row);
        }
        return { data: this._single ? (updated[0] as unknown as Row ?? null) : (updated as unknown as Row[]), error: null };
      }

      return { data: null, error: null };
    }

    // ── SELECT ──────────────────────────────────────────────────────────────
    if (this.table === "waitlist") {
      let rows = getQueue() as unknown as Row[];
      rows = this._applyEqFilters(rows);
      rows = this._sorted(rows);
      return { data: this._single ? (rows[0] ?? null) : rows, error: null };
    }

    if (this.table === "seated_history") {
      let rows = getHistory() as unknown as Row[];
      rows = this._applyEqFilters(rows);
      rows = this._sorted(rows);
      return { data: this._single ? (rows[0] ?? null) : rows, error: null };
    }

    return { data: [], error: null };
  }
}

export class MockSupabaseClient {
  private channels: MockChannel[] = [];

  from(_table: string) {
    return new MockQueryBuilder(_table);
  }

  channel(name: string) {
    const ch = new MockChannel(name);
    this.channels.push(ch);
    return ch;
  }

  removeChannel(ch: MockChannel) {
    ch.close();
    this.channels = this.channels.filter((c) => c !== ch);
  }
}

let mockClient: MockSupabaseClient | null = null;

export function getMockSupabase(): MockSupabaseClient {
  if (!mockClient) mockClient = new MockSupabaseClient();
  return mockClient;
}
