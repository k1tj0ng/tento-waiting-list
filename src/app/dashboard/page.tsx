"use client";

import { useEffect, useState } from "react";
import { getSupabase, isSimulationMode } from "@/lib/supabaseClient";
import { WaitlistEntry, SeatedRecord } from "@/lib/types";
import QueueRow from "@/components/QueueRow";
import SimBanner from "@/components/SimBanner";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function DashboardPage() {
  const [queue, setQueue] = useState<WaitlistEntry[]>([]);
  const [history, setHistory] = useState<SeatedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [nowTick, setNowTick] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();

    async function init() {
      // Run daily reset and load history (simulation only).
      if (isSimulationMode()) {
        const { runDailyReset, getHistory } = await import("@/lib/mockSupabase");
        runDailyReset();
        setHistory(getHistory());
      }

      const { data } = await supabase
        .from("waitlist")
        .select("*")
        .order("created_at", { ascending: true });
      setQueue((data as WaitlistEntry[]) ?? []);
      setLoading(false);
    }
    init();

    const channel = supabase
      .channel("waitlist-dashboard")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "waitlist" },
        (payload) => {
          setQueue((prev) => {
            const row = payload.new as WaitlistEntry;
            if (prev.some((e) => e.id === row.id)) return prev;
            return [...prev, row].sort(
              (a, b) =>
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "waitlist" },
        (payload) => {
          const oldRow = payload.old as { id: string };
          setQueue((prev) => prev.filter((e) => e.id !== oldRow.id));
          // In simulation, reload history from storage after delete.
          if (isSimulationMode()) {
            import("@/lib/mockSupabase").then(({ getHistory }) => {
              setHistory(getHistory());
            });
          }
        }
      )
      .subscribe();

    // Listen for cross-tab HISTORY updates (simulation BroadcastChannel).
    let historyBc: BroadcastChannel | null = null;
    if (isSimulationMode() && typeof window !== "undefined") {
      historyBc = new BroadcastChannel("tento_sim");
      historyBc.addEventListener("message", (msg) => {
        if (msg.data?.event === "HISTORY") {
          import("@/lib/mockSupabase").then(({ getHistory }) => {
            setHistory(getHistory());
          });
        }
      });
    }

    return () => {
      supabase.removeChannel(channel);
      historyBc?.close();
    };
  }, []);

  // Re-render elapsed times every 30s.
  useEffect(() => {
    const interval = setInterval(() => setNowTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const totalSeated = history.reduce((sum, r) => sum + r.group_size, 0);

  return (
    <main className="min-h-screen bg-brand-soft">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-neutral-200">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-brand">
              Tento &middot; Host Dashboard
            </h1>
            <p className="text-sm text-neutral-500">Live waitlist</p>
          </div>
          <div className="flex gap-5 text-right">
            <div>
              <p className="text-2xl font-semibold text-brand-accent leading-none">
                {queue.length}
              </p>
              <p className="text-xs uppercase tracking-wide text-neutral-400">
                waiting
              </p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-green-600 leading-none">
                {history.length}
              </p>
              <p className="text-xs uppercase tracking-wide text-neutral-400">
                seated today
              </p>
            </div>
          </div>
        </div>
      </header>

      <SimBanner />

      <div className="max-w-3xl mx-auto px-5 py-6 space-y-3">
        {loading ? (
          <p className="text-center text-neutral-400 py-20">Loading queue…</p>
        ) : queue.length === 0 && history.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-3">🎉</p>
            <p className="text-neutral-500">No one is waiting. Enjoy the calm.</p>
          </div>
        ) : (
          <>
            {queue.length === 0 ? (
              <div className="text-center py-8 text-neutral-400 text-sm">
                No one waiting right now.
              </div>
            ) : (
              queue.map((entry) => (
                <QueueRow key={entry.id} entry={entry} nowTick={nowTick} />
              ))
            )}

            {/* Seated history */}
            {history.length > 0 && (
              <div className="mt-8">
                <button
                  onClick={() => setHistoryOpen((o) => !o)}
                  className="w-full flex items-center justify-between text-left mb-3 group"
                >
                  <span className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">
                    Seated Today &mdash; {history.length}{" "}
                    {history.length === 1 ? "party" : "parties"},{" "}
                    {totalSeated} guests
                  </span>
                  <span className="text-neutral-400 text-xs group-hover:text-neutral-600 transition">
                    {historyOpen ? "Hide ▲" : "Show ▼"}
                  </span>
                </button>

                {historyOpen && (
                  <div className="space-y-2">
                    {[...history].reverse().map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center gap-4 bg-white/60 rounded-2xl border border-neutral-200 px-5 py-3"
                      >
                        <div className="h-8 w-8 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                          <span className="text-green-600 text-sm font-bold">✓</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-neutral-700 truncate">
                              {r.name}
                            </span>
                            <span className="text-xs text-neutral-400 shrink-0">
                              {r.group_size === 10 ? "10+" : r.group_size} guests
                            </span>
                          </div>
                          <p className="text-xs text-neutral-400 mt-0.5">
                            Seated at {formatTime(r.seated_at)} &middot; waited{" "}
                            {Math.max(
                              0,
                              Math.floor(
                                (new Date(r.seated_at).getTime() -
                                  new Date(r.created_at).getTime()) /
                                  60000
                              )
                            )}{" "}
                            min
                          </p>
                        </div>
                        <a
                          href={`tel:${r.phone}`}
                          className="text-xs text-brand-accent shrink-0"
                        >
                          {r.phone}
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
