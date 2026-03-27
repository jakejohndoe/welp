"use client";

import { Providers } from "./Providers";
import { Navbar } from "./Navbar";

export function ClientShell({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <Navbar />
      <main className="flex-1">{children}</main>
      <footer className="text-center text-xs text-gray-400 py-4 border-t border-gray-100">
        MVP Demo &mdash; In production, check-ins would require QR
        verification, NFC tags, or geolocation proof.
      </footer>
    </Providers>
  );
}
