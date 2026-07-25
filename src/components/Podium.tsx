"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import type { TallyEntry } from "@/types/game";

const PODIUM_ORDER = [1, 0, 2]; // visual left-to-right: 2nd, 1st, 3rd
const HEIGHTS = ["h-28", "h-40", "h-20"];
const MEDALS = ["🥈", "🥇", "🥉"];
const DELAYS = [0.9, 1.5, 0.3]; // 3rd revealed first, then 2nd, then 1st

export function Podium({ top }: { top: TallyEntry[] }) {
  const slots = PODIUM_ORDER.map((idx) => top[idx]).filter(Boolean) as TallyEntry[];

  return (
    <div className="flex items-end justify-center gap-4 md:gap-8">
      {slots.map((entry, i) => (
        <motion.div
          key={entry.key}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: DELAYS[i], type: "spring", stiffness: 120, damping: 14 }}
          className="flex flex-col items-center gap-2"
        >
          <div className="text-4xl md:text-5xl">{MEDALS[i]}</div>
          <div className="text-lg md:text-2xl font-bold text-brand-white text-center max-w-[10rem] truncate">
            {entry.label}
          </div>
          <div className="text-brand-gold font-bold">{entry.votes} קולות</div>
          <div
            className={clsx(
              "w-20 md:w-28 rounded-t-xl bg-gradient-to-t from-brand-gold to-brand-gold-light shadow-sm",
              HEIGHTS[i]
            )}
          />
        </motion.div>
      ))}
    </div>
  );
}
