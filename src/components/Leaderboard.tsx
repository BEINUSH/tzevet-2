"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import type { PublicParticipant } from "@/types/game";

export function Leaderboard({ participants, limit }: { participants: PublicParticipant[]; limit?: number }) {
  const sorted = [...participants].sort((a, b) => b.score - a.score).slice(0, limit);
  return (
    <div className="flex flex-col gap-2 w-full max-w-xl mx-auto">
      {sorted.map((p, i) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className={clsx(
            "flex items-center gap-4 rounded-xl px-4 py-3",
            i === 0 ? "bg-brand-gold/15 border border-brand-gold/50" : "bg-brand-navy-lighter"
          )}
        >
          <div className="w-8 text-center font-bold text-brand-muted">
            {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
          </div>
          <div className="flex-1 font-semibold truncate">{p.name}</div>
          <div className="font-bold tabular-nums text-brand-gold">{p.score}</div>
        </motion.div>
      ))}
    </div>
  );
}
