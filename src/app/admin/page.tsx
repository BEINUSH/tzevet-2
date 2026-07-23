import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { NewEventForm } from "./NewEventForm";
import { DeleteEventButton } from "./DeleteEventButton";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const events = await prisma.event.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { rounds: true, sessions: true } } },
  });

  return (
    <main className="flex-1 flex flex-col items-center px-6 py-10 gap-6 max-w-2xl mx-auto w-full">
      <Link href="/" className="self-start text-brand-muted hover:text-brand-white text-sm">
        ← חזרה למסך הבית
      </Link>

      <h1 className="text-3xl font-black gold-text">ניהול תוכן</h1>
      <p className="text-brand-muted text-center -mt-4">יצירת אירועים ועריכת סבבים ושאלות</p>

      <Card className="w-full text-sm">
        <h2 className="font-bold mb-2">איך עובדים כאן?</h2>
        <ol className="list-decimal list-inside space-y-1 text-brand-muted">
          <li>יוצרים אירוע חדש או בוחרים אירוע קיים.</li>
          <li>נכנסים לעריכה ומוסיפים או משנים שאלות וסבבים.</li>
          <li>חוזרים למסך המנחה ופותחים חדר למשתתפים.</li>
        </ol>
      </Card>

      <Card className="w-full">
        <NewEventForm />
      </Card>

      <div className="w-full flex flex-col gap-3">
        {events.map((e) => (
          <Card key={e.id} className="flex items-center justify-between gap-4">
            <Link href={`/admin/events/${e.id}`} className="flex-1">
              <div className="font-bold text-lg">{e.name}</div>
              <div className="text-brand-muted text-sm">
                {e._count.rounds} סבבים · {e._count.sessions} הרצות
              </div>
            </Link>
            <div className="flex gap-2">
              <Link href={`/admin/events/${e.id}`} className="text-brand-gold underline text-sm">
                עריכה
              </Link>
              <DeleteEventButton eventId={e.id} eventName={e.name} />
            </div>
          </Card>
        ))}
        {events.length === 0 && <p className="text-brand-muted text-center">אין עדיין אירועים</p>}
      </div>

      <Link href="/host" className="text-brand-muted underline text-sm">
        חזרה למסך מנחה
      </Link>
    </main>
  );
}
