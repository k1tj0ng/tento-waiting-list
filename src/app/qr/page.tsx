"use client";

import { QRCodeSVG } from "qrcode.react";

const URL = "https://tento-waiting-list.vercel.app";

export default function QRPage() {
  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center gap-8 p-10 print:p-6">
      <div className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-brand">Tento</h1>
        <p className="mt-2 text-neutral-500">Join the waitlist</p>
      </div>

      <div className="p-6 rounded-3xl border-2 border-neutral-200">
        <QRCodeSVG
          value={URL}
          size={260}
          bgColor="#ffffff"
          fgColor="#1a1a2e"
          level="M"
        />
      </div>

      <div className="text-center space-y-1">
        <p className="text-sm text-neutral-400">Scan with your phone camera</p>
        <p className="text-xs text-neutral-300 font-mono">{URL}</p>
      </div>

      <button
        onClick={() => window.print()}
        className="mt-4 rounded-xl border border-neutral-300 px-6 py-2.5 text-sm text-neutral-600 hover:bg-neutral-50 transition print:hidden"
      >
        Print
      </button>
    </main>
  );
}
