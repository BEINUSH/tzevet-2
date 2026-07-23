"use client";

import { motion } from "framer-motion";
import type { PublicOption } from "@/types/game";

export function ChoiceVote({
  options,
  onVote,
}: {
  options: PublicOption[];
  onVote: (optionId: string) => void;
}) {
  const letters = ["א", "ב", "ג", "ד", "ה", "ו"];
  return (
    <div className="flex flex-col gap-3 w-full">
      {options.map((o, i) => (
        <motion.button
          key={o.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onVote(o.id)}
          className="card-glass rounded-2xl px-4 py-4 flex items-center gap-3 text-right active:border-brand-gold active:bg-brand-gold/10"
        >
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-gold/20 text-brand-gold font-bold shrink-0">
            {letters[i] ?? i + 1}
          </span>
          <span className="font-semibold text-lg">{o.text}</span>
        </motion.button>
      ))}
    </div>
  );
}
