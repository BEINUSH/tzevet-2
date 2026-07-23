"use client";

import { motion } from "framer-motion";
import type { PublicOption } from "@/types/game";

export function HeadToHeadVote({ options, onVote }: { options: PublicOption[]; onVote: (optionId: string) => void }) {
  const [a, b] = options;
  return (
    <div className="flex flex-col gap-4 w-full items-center">
      {a && (
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => onVote(a.id)}
          className="card-glass rounded-2xl px-6 py-8 w-full text-center active:border-brand-gold active:bg-brand-gold/10"
        >
          <div className="text-2xl font-black">{a.text}</div>
        </motion.button>
      )}
      <div className="text-3xl font-black gold-text">VS</div>
      {b && (
        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => onVote(b.id)}
          className="card-glass rounded-2xl px-6 py-8 w-full text-center active:border-brand-gold active:bg-brand-gold/10"
        >
          <div className="text-2xl font-black">{b.text}</div>
        </motion.button>
      )}
    </div>
  );
}
