"use client";

import { isSimulationMode } from "@/lib/supabaseClient";

export default function SimBanner() {
  if (!isSimulationMode()) return null;
  return (
    <div className="my-4 rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-2 text-center text-xs text-yellow-800">
      <span className="font-semibold">Simulation mode</span> — data lives in
      localStorage &amp; BroadcastChannel. No Supabase required.
    </div>
  );
}
