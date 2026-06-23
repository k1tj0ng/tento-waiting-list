"use client";

import { useState, FormEvent } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import { formatAuMobile, isValidAuMobile } from "@/lib/phone";
import { WaitlistEntry } from "@/lib/types";

const GROUP_SIZES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function WaitlistForm({
  onJoined,
}: {
  onJoined: (entry: WaitlistEntry) => void;
}) {
  const [name, setName] = useState("");
  const [groupSize, setGroupSize] = useState(2);
  const [isLarge, setIsLarge] = useState(false);
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!isValidAuMobile(phone)) {
      setError("Please enter a valid Australian mobile (04XX XXX XXX).");
      return;
    }

    setSubmitting(true);
    const supabase = getSupabase();

    const { data, error: dbError } = await supabase
      .from("waitlist")
      .insert({
        name: name.trim(),
        group_size: isLarge ? 10 : groupSize,
        phone: formatAuMobile(phone),
      })
      .select()
      .single();

    setSubmitting(false);

    if (dbError || !data) {
      setError("Something went wrong. Please try again.");
      return;
    }

    onJoined(data as WaitlistEntry);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-6 space-y-5"
    >
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-neutral-700 mb-1.5"
        >
          Name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          autoComplete="name"
          className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
        />
      </div>

      <div>
        <label
          htmlFor="group"
          className="block text-sm font-medium text-neutral-700 mb-1.5"
        >
          Group Size
        </label>
        <select
          id="group"
          value={isLarge ? "10+" : String(groupSize)}
          onChange={(e) => {
            if (e.target.value === "10+") {
              setIsLarge(true);
            } else {
              setIsLarge(false);
              setGroupSize(Number(e.target.value));
            }
          }}
          className="w-full rounded-xl border border-neutral-300 px-4 py-3 bg-white outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
        >
          {GROUP_SIZES.map((n) =>
            n === 10 ? (
              <option key="10+" value="10+">
                10+
              </option>
            ) : (
              <option key={n} value={n}>
                {n} {n === 1 ? "person" : "people"}
              </option>
            )
          )}
        </select>
      </div>

      <div>
        <label
          htmlFor="phone"
          className="block text-sm font-medium text-neutral-700 mb-1.5"
        >
          Mobile Number
        </label>
        <input
          id="phone"
          type="tel"
          inputMode="numeric"
          value={phone}
          onChange={(e) => setPhone(formatAuMobile(e.target.value))}
          placeholder="04XX XXX XXX"
          autoComplete="tel"
          className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-brand-accent text-white font-semibold py-3.5 transition active:scale-[0.99] disabled:opacity-60"
      >
        {submitting ? "Joining…" : "Join Waitlist"}
      </button>
    </form>
  );
}
