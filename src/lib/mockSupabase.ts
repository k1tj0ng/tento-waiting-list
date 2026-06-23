import { WaitlistEntry, SeatedRecord } from "./types";

const STORAGE_KEY = "tento_sim_queue";
const HISTORY_KEY = "tento_sim_history";
const DATE_KEY = "tento_sim_date";
const CHANNEL_NAME = "tento_sim";

// ── Daily reset ────────────────────────────────────────────────────────────
// On each load, if the stored date isn't today, wipe queue + history.
function todayStr(): string {
  return new Date().toLocaleDateString("en-AU", { timeZone: "Australia/Sydney" });
}

export function runDailyReset(): void {
  if (typeof window === "undefined") return;
  const stored = localStorage.getItem(DATE_KEY);
  const today = todayStr();
  if (stored !== today) {
    localStorage.setItem(STORAGE_KEY, "[]");
    localStorage.setItem(HISTORY_KEY, "[]");
    localStorage.setItem(DATE_KEY, today);
  }
}

// ── Queue helpers ──────────────────────────────────────────────────────────
function getQueue(): WaitlistEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveQueue(q: WaitlistEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(q));
}

// ── History helpers ────────────────────────────────────────────────────────
export function getHistory(): SeatedRecord[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function addToHistory(entry: WaitlistEntry) {
  const history = getHistory();
  history.push({ ...entry, seated_at: new Date().toISOString() });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

// ── BroadcastChannel ───────────────────────────────────────────────────────
function broadcast(event: "INSERT" | "DELETE" | "HISTORY", row: Partial<WaitlistEntry>) {
  try {
    const bc = new BroadcastChannel(CHANNEL_NAME);
    bc.postMessage({ event, row });
    bc.close();
  } catch {}
}

type ChangeEvent = "INSERT" | "DELETE";
type Listener = (payload: {
  event: ChangeEvent;
  new?: WaitlistEntry;
  old?: Partial<WaitlistEntry>;
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
      const { event, row } = msg.data as { event: ChangeEvent; row: WaitlistEntry };
      for (const { filter, cb } of this.listeners) {
        if (filter.event !== event) continue;
        if (filter.filter) {
          const parts = filter.filter.split("=eq.");
          const val = parts[1]?.trim();
          if (event === "DELETE" && val && row.id !== val) continue;
        }
        cb(event === "INSERT" ? { event, new: row } : { event, old: row });
      }
    };
    return this;
  }

  close() {
    this.bc?.close();
    this.bc = null;
  }
}

type Operation = "insert" | "select" | "delete";

class MockQueryBuilder {
  private _op: Operation = "select";
  private _data: Partial<WaitlistEntry> | null = null;
  private _eqFilters: Record<string, string> = {};
  private _neqFilters: Record<string, string> = {};
  private _orderCol: string | null = null;
  private _orderAsc = true;
  private _single = false;

  constructor(private table: string) {}

  insert(data: Partial<WaitlistEntry>) {
    this._op = "insert";
    this._data = data;
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

  then(
    resolve: (result: { data: WaitlistEntry | WaitlistEntry[] | null; error: null }) => void
  ) {
    Promise.resolve().then(() => resolve(this._execute()));
  }

  private _execute(): { data: WaitlistEntry | WaitlistEntry[] | null; error: null } {
    if (this._op === "insert") {
      const queue = getQueue();
      const entry: WaitlistEntry = {
        id: crypto.randomUUID(),
        name: (this._data?.name as string) ?? "",
        group_size: (this._data?.group_size as number) ?? 1,
        phone: (this._data?.phone as string) ?? "",
        status: "waiting",
        created_at: new Date().toISOString(),
      };
      queue.push(entry);
      saveQueue(queue);
      broadcast("INSERT", entry);
      return { data: this._single ? entry : [entry], error: null };
    }

    if (this._op === "delete") {
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
        addToHistory(r);
        broadcast("DELETE", r);
        broadcast("HISTORY", r);
      }
      return { data: null, error: null };
    }

    // select
    let queue = getQueue();
    for (const [col, val] of Object.entries(this._eqFilters)) {
      queue = queue.filter((e) => String(e[col as keyof WaitlistEntry]) === val);
    }
    if (this._orderCol) {
      const col = this._orderCol as keyof WaitlistEntry;
      const asc = this._orderAsc;
      queue = [...queue].sort((a, b) => {
        const av = String(a[col]);
        const bv = String(b[col]);
        return asc ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }
    return { data: this._single ? (queue[0] ?? null) : queue, error: null };
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
