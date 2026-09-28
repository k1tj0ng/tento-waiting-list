"use client";

import { useState, useEffect } from "react";
import WaitlistForm from "@/components/WaitlistForm";
import SuccessScreen from "@/components/SuccessScreen";
import SimBanner from "@/components/SimBanner";
import { WaitlistEntry } from "@/lib/types";

const STORAGE_KEY = "tento_customer_entry";

function isSameDay(isoDate: string): boolean {
  const entryDay = new Date(isoDate).toLocaleDateString("en-AU", {
    timeZone: "Australia/Sydney",
  });
  const today = new Date().toLocaleDateString("en-AU", {
    timeZone: "Australia/Sydney",
  });
  return entryDay === today;
}

export default function CustomerPage() {
  const [entry, setEntry] = useState<WaitlistEntry | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Restore from localStorage on mount (client-only)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: WaitlistEntry = JSON.parse(stored);
        if (isSameDay(parsed.created_at)) {
          setEntry(parsed);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    setHydrated(true);
  }, []);

  function handleJoined(newEntry: WaitlistEntry) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newEntry));
    } catch {}
    setEntry(newEntry);
  }

  function handleRejoin() {
    localStorage.removeItem(STORAGE_KEY);
    setEntry(null);
  }

  // Show just the header while checking localStorage to avoid form flash
  if (!hydrated) {
    return (
      <main className="min-h-screen bg-brand-soft flex flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <header className="text-center mb-8">
            <h1 className="text-3xl font-semibold tracking-tight text-brand">
              Tento
            </h1>
          </header>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-soft flex flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-brand">
            Tento
          </h1>
        </header>

        {entry ? (
          <SuccessScreen entry={entry} onRejoin={handleRejoin} />
        ) : (
          <WaitlistForm onJoined={handleJoined} />
        )}

        <SimBanner />
        <footer className="mt-8 text-center text-xs text-neutral-400">
          We never store your details. Your info is removed the moment you&apos;re
          seated.
        </footer>
      </div>
    </main>
  );
}
