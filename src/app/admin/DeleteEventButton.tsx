"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteEvent } from "./actions";

export function DeleteEventButton({ eventId, eventName }: { eventId: string; eventName: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (confirming) {
    return (
      <div className="flex items-center gap-1 text-sm">
        <span className="text-brand-muted">למחוק את &quot;{eventName}&quot;?</span>
        <button
          className="text-brand-danger font-bold"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await deleteEvent(eventId);
              router.refresh();
            })
          }
        >
          כן
        </button>
        <button className="text-brand-muted" onClick={() => setConfirming(false)}>
          לא
        </button>
      </div>
    );
  }

  return (
    <button className="text-brand-danger text-sm underline" onClick={() => setConfirming(true)}>
      מחיקה
    </button>
  );
}
