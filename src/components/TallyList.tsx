"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import type { TallyEntry } from "@/types/game";

export function TallyList({
  tally,
  winnerKeys = [],
  correctKeys = [],
  size = "md",
}: {
  tally: TallyEntry[];
  winnerKeys?: string[];
  correctKeys?: string[];
  size?: "sm" | "md" | "lg";
}) {
  const maxVotes = Math.max(1, ...tally.map((t) => t.votes));
  const totalVotes = tally.reduce((sum, entry) => sum + entry.votes, 0);
  const textSize = size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-base";
  const barHeight = size === "lg" ? "h-8" : size === "sm" ? "h-4" : "h-6";

  return (
    <div className="flex flex-col gap-2 w-full">
      {tally.map((t, i) => {
        const isWinner = winnerKeys.includes(t.key) && t.votes > 0;
        const isCorrect = correctKeys.includes(t.key);
        const percentage = totalVotes > 0 ? Math.round((t.votes / totalVotes) * 100) : 0;
        return (
          <motion.div
            key={t.key}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-center gap-3"
          >
            <div
              className={clsx(
                "w-28 shrink-0 truncate font-semibold",
                textSize,
                isWinner || isCorrect ? "text-brand-gold" : "text-brand-white"
              )}
            >
              {isWinner ? "👑 " : isCorrect ? "✅ " : ""}
              {t.label}
            </div>
            <div className={clsx("flex-1 rounded-full bg-brand-navy-lighter overflow-hidden", barHeight)}>
              <motion.div
                className={clsx(
                  "h-full rounded-full",
                  isWinner || isCorrect ? "bg-brand-gold" : "bg-brand-muted/40"
                )}
                initial={{ width: 0 }}
                animate={{ width: `${(t.votes / maxVotes) * 100}%` }}
                transition={{ delay: i * 0.08 + 0.1, duration: 0.6, ease: "easeOut" }}
              />
            </div>
            <div className={clsx("w-24 text-left font-bold tabular-nums", textSize)}>
              {t.votes} <span className="text-brand-muted text-[0.7em]">({percentage}%)</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
