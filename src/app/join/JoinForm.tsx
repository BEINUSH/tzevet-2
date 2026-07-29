"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { emitWithTimeout } from "@/lib/socketClient";
import { saveParticipantSession } from "@/lib/storage";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface JoinResponse {
  ok: boolean;
  error?: string;
  deviceToken?: string;
  participantId?: string;
  name?: string;
}

export function JoinForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [code, setCode] = useState((params.get("code") || "").toUpperCase());
  const [name, setName] = useState("");
  const [teamNumber, setTeamNumber] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isTakingLong, setIsTakingLong] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !name.trim() || !teamNumber) {
      setError("יש להזין שם ולבחור צוות");
      return;
    }
    setLoading(true);
    setIsTakingLong(false);
    setError("");
    const upperCode = code.trim().toUpperCase();
    const slowTimer = window.setTimeout(() => setIsTakingLong(true), 2_500);

    try {
      const res = await emitWithTimeout<JoinResponse>("participant:join", {
        code: upperCode,
        name: name.trim(),
        teamNumber,
      });

      if (res.ok && res.deviceToken) {
        saveParticipantSession({ code: upperCode, deviceToken: res.deviceToken, name: name.trim() });
        router.push(`/play/${upperCode}`);
      } else {
        setError(res.error || "משהו השתבש, נסו שוב");
      }
    } catch {
      setError("השרת לא הגיב. המתינו כמה שניות ונסו שוב.");
    } finally {
      window.clearTimeout(slowTimer);
      setLoading(false);
      setIsTakingLong(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-6 sm:gap-8 px-4 sm:px-6 py-8 sm:py-10 text-center">
      <a href="/" className="w-full max-w-sm text-right text-brand-muted hover:text-brand-white text-sm">
        ← חזרה למסך הבית
      </a>

      <div>
        <div className="text-5xl mb-2">🎖️</div>
        <h1 className="text-3xl font-black gold-text">סיירת יואב - צוות בן ססי</h1>
        <p className="text-brand-muted mt-1">הצטרפות למשחק</p>
      </div>

      <Card className="w-full max-w-sm">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <input
            className="w-full rounded-xl bg-brand-navy-lighter border border-brand-gold/20 px-4 py-4 text-center text-2xl font-black tracking-[0.3em] uppercase focus:outline-none focus:border-brand-gold"
            placeholder="קוד"
            aria-label="קוד חדר"
            value={code}
            maxLength={4}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            dir="ltr"
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <input
            className="w-full rounded-xl bg-brand-navy-lighter border border-brand-gold/20 px-4 py-3 text-center text-lg focus:outline-none focus:border-brand-gold"
            placeholder="השם שלך"
            aria-label="השם שלך"
            value={name}
            maxLength={24}
            autoComplete="nickname"
            onChange={(e) => setName(e.target.value)}
          />
          <div className="text-right">
            <p className="mb-2 text-sm font-bold text-brand-muted">באיזה צוות אתה?</p>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((team) => (
                <button
                  key={team}
                  type="button"
                  onClick={() => setTeamNumber(team)}
                  className={`rounded-xl border px-2 py-3 font-black transition ${
                    teamNumber === team
                      ? "border-brand-gold bg-brand-gold/20 text-brand-gold"
                      : "border-brand-gold/20 bg-brand-navy-lighter text-brand-white"
                  }`}
                >
                  צוות {team}
                </button>
              ))}
            </div>
          </div>
          {isTakingLong && (
            <p className="text-brand-muted text-sm" role="status">
              השרת מתעורר — זה עשוי לקחת עוד כמה שניות.
            </p>
          )}
          {error && (
            <p className="text-brand-danger text-sm font-semibold" role="alert">
              {error}
            </p>
          )}
          <Button size="lg" type="submit" disabled={loading} aria-busy={loading} className="w-full">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <LoadingSpinner />
                מצטרפים...
              </span>
            ) : (
              "כניסה למשחק"
            )}
          </Button>
        </form>
      </Card>
    </main>
  );
}
