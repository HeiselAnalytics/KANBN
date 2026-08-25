"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex h-dvh items-center justify-center p-6">
      <div className="max-w-md text-center">
        <AlertTriangle className="mx-auto text-[var(--danger)]" aria-hidden="true" />
        <h1 className="mb-2 mt-4 text-2xl font-semibold">KANBN could not be loaded</h1>
        <p className="muted mb-6 mt-0">Check the database connection and try again.</p>
        <button className="button" onClick={reset}><RotateCcw size={16} /> Try again</button>
      </div>
    </main>
  );
}
