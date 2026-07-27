"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { emitWithTimeout } from "@/lib/socketClient";
import { loadHostSession, saveHostSession } from "@/lib/storage";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface EventSummary {
  id: string;
  name: string;
  roundCount: number;
}

type GameLength = 25 | 35 | "all";

export function HostLanding({ events }: { events: EventSummary[] }) {
  const router = useRouter();
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isTakingLong, setIsTakingLong] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const session = loadHostSession();
    if (session) setActiveCode(session.code);
  }, []);

  async function handleOpen(eventId: string, gameLength: GameLength) {
    if (loadingId) return;

    setLoadingId(eventId);
    setIsTakingLong(false);
    setError("");
    const slowTimer = window.setTimeout(() => setIsTakingLong(true), 2_500);

    try {
      const res = await emitWithTimeout<{
        ok: boolean;
        code?: string;
        hostToken?: string;
        error?: string;
      }>("host:createSession", { eventId, roundLimit: gameLength === "all" ? null : gameLength });

      if (res.ok && res.code && res.hostToken) {
        saveHostSession({ code: res.code, hostToken: res.hostToken });
        router.push(`/host/${res.code}`);
      } else {
        setError(res.error || "שגיאה בפתיחת חדר");
      }
    } catch {
      setError("השרת לא הגיב. ייתכן שהוא עדיין מתעורר — נסו שוב בעוד כמה שניות.");
    } finally {
      window.clearTimeout(slowTimer);
      setLoadingId(null);
      setIsTakingLong(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col items-center px-6 py-10 gap-6 max-w-xl mx-auto w-full">
      <Link href="/" className="self-start text-brand-muted hover:text-brand-white text-sm">
        ← חזרה למסך הבית
      </Link>

      <h1 className="text-3xl font-black gold-text">מסך מנחה</h1>
      <Card className="w-full text-sm text-brand-muted">
        <p className="font-bold text-brand-white mb-1">איך מתחילים?</p>
        <p>בחרו אורך משחק. במסך הבא יופיעו קוד ו־QR לשליחה למשתתפים.</p>
        <p className="mt-2">
          גם במשחק קצר המערכת דואגת שתופיע לפחות שאלה אחת על כל חבר צוות.
        </p>
        <p className="mt-2">
          רוצים לבדוק בלי להזמין חברים? פתחו חדר ובחרו שם <span className="font-bold text-brand-gold">„הוספת 10 בוטים לדמו”</span>.
        </p>
      </Card>

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
          <Card key={e.id} className="flex flex-col gap-4">
            <div>
              <div className="font-bold text-lg">{e.name}</div>
              <div className="text-brand-muted text-sm">{e.roundCount} סבבים</div>
            </div>
            {loadingId === e.id ? (
              <Button disabled aria-busy className="w-full">
                <span className="flex items-center justify-center gap-2">
                  <LoadingSpinner />
                  פותח חדר...
                </span>
              </Button>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Button onClick={() => handleOpen(e.id, 25)} disabled={loadingId !== null}>
                  קצר · 25
                </Button>
                <Button onClick={() => handleOpen(e.id, 35)} disabled={loadingId !== null} variant="secondary">
                  רגיל · 35
                </Button>
                <Button onClick={() => handleOpen(e.id, "all")} disabled={loadingId !== null} variant="ghost">
                  מלא · {e.roundCount}
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      {isTakingLong && (
        <p className="text-brand-muted text-sm text-center" role="status">
          השרת מתעורר — זה עשוי לקחת עוד כמה שניות.
        </p>
      )}

      {error && (
        <p className="text-brand-danger font-semibold text-center" role="alert">
          {error}
        </p>
      )}

      <Link href="/admin" className="text-brand-muted underline text-sm">
        ניהול תוכן ⚙️
      </Link>
    </main>
  );
}
