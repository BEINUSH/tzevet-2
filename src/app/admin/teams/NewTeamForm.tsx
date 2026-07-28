"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTeam } from "./actions";
import { Button } from "@/components/ui/Button";

export function NewTeamForm() {
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    startTransition(async () => {
      await createTeam(name.trim());
      setName("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        className="flex-1 rounded-xl bg-brand-navy-lighter border border-brand-gold/20 px-4 py-3 focus:outline-none focus:border-brand-gold"
        placeholder="שם צוות חדש, למשל: צוות 3"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Button type="submit" disabled={pending || !name.trim()}>
        {pending ? "יוצר..." : "צוות חדש"}
      </Button>
    </form>
  );
}
