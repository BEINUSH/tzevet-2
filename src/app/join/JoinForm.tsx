"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { emitAsync } from "@/lib/socketClient";
import { saveParticipantSession } from "@/lib/storage";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;
    setLoading(true);
    setError("");
    const upperCode = code.trim().toUpperCase();
    const res = await emitAsync<JoinResponse>("participant:join", { code: upperCode, name: name.trim() });
    setLoading(false);
    if (res.ok && res.deviceToken) {
      saveParticipantSession({ code: upperCode, deviceToken: res.deviceToken, name: name.trim() });
      router.push(`/play/${upperCode}`);
    } else {
      setError(res.error || "משהו השתבש, נסו שוב");
    }
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-8 px-6 py-10 text-center">
      <div>
        <div className="text-5xl mb-2">🎖️</div>
        <h1 className="text-3xl font-black gold-text">ערב גיבוש</h1>
        <p className="text-brand-muted mt-1">הצטרפות למשחק</p>
      </div>

      <Card className="w-full max-w-sm">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <input
            className="w-full rounded-xl bg-brand-navy-lighter border border-brand-gold/20 px-4 py-4 text-center text-2xl font-black tracking-[0.3em] uppercase focus:outline-none focus:border-brand-gold"
            placeholder="קוד"
            value={code}
            maxLength={4}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <input
            className="w-full rounded-xl bg-brand-navy-lighter border border-brand-gold/20 px-4 py-3 text-center text-lg focus:outline-none focus:border-brand-gold"
            placeholder="השם שלך"
            value={name}
            maxLength={24}
            onChange={(e) => setName(e.target.value)}
          />
          {error && <p className="text-brand-danger text-sm font-semibold">{error}</p>}
          <Button size="lg" type="submit" disabled={loading}>
            {loading ? "מצטרפים..." : "כניסה למשחק"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
