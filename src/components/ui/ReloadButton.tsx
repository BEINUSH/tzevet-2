"use client";

export function ReloadButton() {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="w-full rounded-2xl border border-brand-gold/20 px-5 py-4 font-bold hover:border-brand-gold/60 transition-colors"
    >
      ↻ טעינה מחדש
    </button>
  );
}
