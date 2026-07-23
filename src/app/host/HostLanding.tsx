"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { emitAsync } from "@/lib/socketClient";
import { loadHostSession, saveHostSession } from "@/lib/storage";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface EventSummary {
  id: string;
  name: string;
  roundCount: number;
}

export function HostLanding({ events }: { events: EventSummary[] }) {
  const router = useRouter();
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const session = loadHostSession();
    if (session) setActiveCode(session.code);
  }, []);

  async function handleOpen(eventId: string) {
    setLoadingId(eventId);
    setError("");
    const res = await emitAsync<{ ok: boolean; code?: string; hostToken?: string; error?: string }>(
      "host:createSession",
      { eventId }
    );
    setLoadingId(null);
    if (res.ok && res.code && res.hostToken) {
      saveHostSession({ code: res.code, hostToken: res.hostToken });
      router.push(`/host/${res.code}`);
    } else {
      setError(res.error || "שגיאה בפתיחת חדר");
    }
  }

  return (
    <main className="flex-1 flex flex-col items-center px-6 py-10 gap-6 max-w-xl mx-auto w-full">
      <h1 className="text-3xl font-black gold-text">מסך מנחה</h1>

      {activeCode && (
        <Card className="w-full flex items-center justify-between">
          <span>יש לך חדר פעיל: <span className="font-bold text-brand-gold">{activeCode}</span></span>
          <Link href={`/host/${activeCode}`}>
            <Button size="sm">חזרה לחדר</Button>
          </Link>
        </Card>
      )}

      <div className="w-full flex flex-col gap-3">
        {events.length === 0 && (
          <Card className="text-center text-brand-muted">
            אין עדיין אירועים. עברו ל<Link href="/admin" className="text-brand-gold underline">ניהול תוכן</Link> כדי ליצור אחד.
          </Card>
        )}
        {events.map((e) => (
          <Card key={e.id} className="flex items-center justify-between gap-4">
            <div>
              <div className="font-bold text-lg">{e.name}</div>
              <div className="text-brand-muted text-sm">{e.roundCount} סבבים</div>
            </div>
            <Button onClick={() => handleOpen(e.id)} disabled={loadingId === e.id}>
              {loadingId === e.id ? "פותח..." : "פתיחת חדר"}
            </Button>
          </Card>
        ))}
      </div>

      {error && <p className="text-brand-danger font-semibold">{error}</p>}

      <Link href="/admin" className="text-brand-muted underline text-sm">
        ניהול תוכן ⚙️
      </Link>
    </main>
  );
}
