"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

export function CountdownBar({
  votingOpenedAt,
  timeLimitSec,
  onTick,
  className,
}: {
  votingOpenedAt: string | null;
  timeLimitSec: number | null;
  onTick?: (secondsLeft: number) => void;
  className?: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  const lastWholeSecond = useRef<number | null>(null);

  useEffect(() => {
    if (!votingOpenedAt || !timeLimitSec) return;
    const interval = setInterval(() => setNow(Date.now()), 150);
    return () => clearInterval(interval);
  }, [votingOpenedAt, timeLimitSec]);

  if (!votingOpenedAt || !timeLimitSec) return null;

  const openedMs = new Date(votingOpenedAt).getTime();
  const elapsed = (now - openedMs) / 1000;
  const remaining = Math.max(0, timeLimitSec - elapsed);
  const pct = Math.max(0, Math.min(100, (remaining / timeLimitSec) * 100));
  const wholeSecond = Math.ceil(remaining);

  if (onTick && lastWholeSecond.current !== wholeSecond) {
    lastWholeSecond.current = wholeSecond;
    onTick(wholeSecond);
  }

  const urgent = remaining <= 5 && remaining > 0;

  return (
    <div className={clsx("w-full", className)}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-brand-muted">זמן להצבעה</span>
        <span className={clsx("font-bold tabular-nums", urgent ? "text-brand-danger" : "text-brand-gold")}>
          {wholeSecond}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-brand-navy-lighter overflow-hidden">
        <div
          className={clsx(
            "h-full rounded-full transition-[width] duration-150 ease-linear",
            urgent ? "bg-brand-danger" : "bg-gradient-to-l from-brand-gold to-brand-gold-light"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
