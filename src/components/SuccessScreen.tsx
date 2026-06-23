"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import { WaitlistEntry } from "@/lib/types";

type LiveStatus = "waiting" | "seated";

export default function SuccessScreen({ entry }: { entry: WaitlistEntry }) {
  const [status, setStatus] = useState<LiveStatus>("waiting");

  useEffect(() => {
    const supabase = getSupabase();

    const channel = supabase
      .channel(`waitlist-self-${entry.id}`)
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "waitlist",
          filter: `id=eq.${entry.id}`,
        },
        () => setStatus("seated")
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [entry.id]);

  const seated = status === "seated";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-8 text-center space-y-5">
      <div
        className={`mx-auto h-16 w-16 rounded-full flex items-center justify-center text-2xl ${
          seated ? "bg-green-100 text-green-700" : "bg-brand-soft text-brand-accent"
        }`}
      >
        {seated ? "✓" : "🍽️"}
      </div>

      {seated ? (
        <>
          <h2 className="text-xl font-semibold">Your table is ready!</h2>
          <p className="text-neutral-600">
            Please see our host to be seated. Thank you for waiting.
          </p>
        </>
      ) : (
        <>
          <h2 className="text-xl font-semibold">You&apos;re on the list!</h2>
          <p className="text-neutral-600">
            We will call you when your table is ready. Please keep this tab open
            to see your status.
          </p>
        </>
      )}

      <div className="pt-2">
        <span
          className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium ${
            seated
              ? "bg-green-50 text-green-700"
              : "bg-amber-50 text-amber-700"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              seated ? "bg-green-500" : "bg-amber-500 animate-pulse"
            }`}
          />
          Status: {seated ? "Table Ready" : "Waiting"}
        </span>
      </div>

      <div className="pt-4 border-t border-neutral-100 text-sm text-neutral-500 text-left">
        <p>
          <span className="font-medium text-neutral-700">{entry.name}</span>{" "}
          &middot;{" "}
          {entry.group_size === 10 ? "10+" : entry.group_size} guests
        </p>
        <p className="text-xs mt-1">{entry.phone}</p>
      </div>
    </div>
  );
}
