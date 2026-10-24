"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h2 className="text-xl font-semibold text-slate-900">Something went wrong</h2>
      <p className="text-slate-600">Please try again. If it keeps happening, reload the page.</p>
      <button onClick={() => reset()} className="rounded-lg bg-indigo-600 px-5 py-2 text-white hover:bg-indigo-700">
        Try again
      </button>
    </main>
  );
}
