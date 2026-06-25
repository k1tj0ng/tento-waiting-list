"use client";

import { QRCodeSVG } from "qrcode.react";

export default function QRPage() {
  return (
    <main className="min-h-screen bg-white flex items-center justify-center">
      <QRCodeSVG
        value="https://tento-waiting-list.vercel.app"
        size={512}
        bgColor="#ffffff"
        fgColor="#000000"
        level="H"
      />
    </main>
  );
}
