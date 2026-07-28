"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getTeamStatus, submitQuestion } from "./actions";
import { MAX_QUESTIONS_PER_TEAM } from "./constants";

export function SubmitForm({ teams }: { teams: { id: string; name: string }[] }) {
  const [teamId, setTeamId] = useState("");
  const [text, setText] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, startTransition] = useTransition();

  function handleTeamChange(id: string) {
    setTeamId(id);
    setError("");
    setSuccess("");
    setRemaining(null);
    if (!id) return;
    startTransition(async () => {
      const status = await getTeamStatus(id);
      setRemaining(status.remaining);
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!teamId || !text.trim()) return;
    setError("");
    setSuccess("");
    startTransition(async () => {
      const res = await submitQuestion(teamId, text.trim());
      if (res.ok) {
        setText("");
        setRemaining(res.remaining ?? null);
        setSuccess("השאלה נשלחה! תודה 🙌");
      } else {
        setError(res.error || "משהו השתבש, נסו שוב");
        if (res.remaining !== undefined) setRemaining(res.remaining);
      }
    });
  }

  const full = remaining === 0;

  return (
    <Card className="w-full max-w-md">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <select
          className="w-full rounded-xl bg-brand-navy-lighter border border-brand-gold/20 px-4 py-3 text-lg focus:outline-none focus:border-brand-gold"
          value={teamId}
          onChange={(e) => handleTeamChange(e.target.value)}
          aria-label="בחרו צוות"
        >
          <option value="">בחרו את הצוות שלכם</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        {teamId && remaining !== null && (
          <p className="text-sm text-brand-muted">
            {full ? `הצוות הגיע למכסה של ${MAX_QUESTIONS_PER_TEAM} שאלות` : `נשארו ${remaining} מתוך ${MAX_QUESTIONS_PER_TEAM} שאלות לצוות`}
          </p>
        )}

        <textarea
          className="w-full rounded-xl bg-brand-navy-lighter border border-brand-gold/20 px-4 py-3 text-lg min-h-28 resize-none focus:outline-none focus:border-brand-gold"
          placeholder="כתבו כאן שאלה על הצוות שלכם..."
          aria-label="שאלה"
          value={text}
          maxLength={500}
          disabled={!teamId || full}
          onChange={(e) => setText(e.target.value)}
        />

        {error && (
          <p className="text-brand-danger text-sm font-semibold" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="text-brand-gold text-sm font-semibold" role="status">
            {success}
          </p>
        )}

        <Button size="lg" type="submit" disabled={pending || !teamId || !text.trim() || full} className="w-full">
          {pending ? "שולח..." : "שליחת שאלה"}
        </Button>
      </form>
    </Card>
  );
}
