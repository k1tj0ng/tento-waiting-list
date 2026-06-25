"use client";

import { useState } from "react";
import WaitlistForm from "@/components/WaitlistForm";
import SuccessScreen from "@/components/SuccessScreen";
import SimBanner from "@/components/SimBanner";
import { WaitlistEntry } from "@/lib/types";

export default function CustomerPage() {
  const [entry, setEntry] = useState<WaitlistEntry | null>(null);

  return (
    <main className="min-h-screen bg-brand-soft flex flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-brand">
            Tento
          </h1>
        </header>

        {entry ? (
          <SuccessScreen entry={entry} />
        ) : (
          <WaitlistForm onJoined={setEntry} />
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
