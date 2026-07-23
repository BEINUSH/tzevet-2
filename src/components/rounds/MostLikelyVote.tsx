"use client";

import { motion } from "framer-motion";
import type { PublicParticipant } from "@/types/game";

export function MostLikelyVote({
  participants,
  selfId,
  allowSelfVote,
  onVote,
}: {
  participants: PublicParticipant[];
  selfId: string;
  allowSelfVote: boolean;
  onVote: (targetId: string) => void;
}) {
  const options = participants.filter((p) => allowSelfVote || p.id !== selfId);
  return (
    <div className="grid grid-cols-2 gap-3 w-full">
      {options.map((p, i) => (
        <motion.button
          key={p.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.03 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => onVote(p.id)}
          className="card-glass rounded-2xl px-3 py-5 font-bold text-lg text-center active:border-brand-gold active:bg-brand-gold/10"
        >
          {p.name}
        </motion.button>
      ))}
    </div>
  );
}
