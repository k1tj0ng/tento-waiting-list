"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import { toTelHref } from "@/lib/phone";
import { WaitlistEntry } from "@/lib/types";

function minutesElapsed(createdAt: string): number {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  return Math.max(0, Math.floor(diffMs / 60000));
}

export default function QueueRow({
  entry,
  nowTick,
}: {
  entry: WaitlistEntry;
  nowTick: number;
}) {
  const [seating, setSeating] = useState(false);
  void nowTick;
  const mins = minutesElapsed(entry.created_at);

  async function seatParty() {
    setSeating(true);
    const supabase = getSupabase();
    const { error } = await supabase
      .from("waitlist")
      .delete()
      .eq("id", entry.id);
    if (error) {
      setSeating(false);
      alert("Could not seat party. Please try again.");
    }
  }

  return (
    <div className="flex items-center gap-4 bg-white rounded-2xl border border-neutral-200 px-5 py-4 shadow-sm">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-brand truncate">
            {entry.name}
          </h3>
          <span className="shrink-0 rounded-full bg-brand-soft text-brand-accent text-sm font-medium px-2.5 py-0.5">
            {entry.group_size === 10 ? "10+" : entry.group_size} guests
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-500">
          <span>
            Waiting {mins} {mins === 1 ? "min" : "mins"}
          </span>
          <a
            href={`tel:${toTelHref(entry.phone)}`}
            className="text-brand-accent font-medium underline-offset-2 hover:underline"
          >
            {entry.phone}
          </a>
        </div>
      </div>

      <button
        onClick={seatParty}
        disabled={seating}
        className="shrink-0 rounded-xl bg-green-600 text-white font-semibold px-5 py-3 transition active:scale-[0.98] disabled:opacity-60"
      >
        {seating ? "Seating…" : "Seat Party"}
      </button>
    </div>
  );
}
