import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { NewEventForm } from "./NewEventForm";
import { DeleteEventButton } from "./DeleteEventButton";
import { archiveEvent, restoreEvent } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const events = await prisma.event.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { rounds: true, sessions: true } } },
  });

  const activeEvents = events.filter((event) => !event.archivedAt);
  const archivedEvents = events.filter((event) => event.archivedAt);

  return (
    <main className="flex-1 flex flex-col items-center px-6 py-10 gap-6 max-w-2xl mx-auto w-full">
      <Link href="/" className="self-start text-brand-muted hover:text-brand-white text-sm">
        ← חזרה למסך הבית
      </Link>

      <h1 className="text-3xl font-black gold-text">ניהול תוכן</h1>
      <p className="text-brand-muted text-center -mt-4">יצירת אירועים, עריכת סבבים וניהול הארכיון</p>

      <Card className="w-full text-sm">
        <h2 className="font-bold mb-2">איך עובדים כאן?</h2>
        <ol className="list-decimal list-inside space-y-1 text-brand-muted">
          <li>יוצרים אירוע חדש או בוחרים אירוע קיים.</li>
          <li>נכנסים לעריכה ומוסיפים או משנים שאלות וסבבים.</li>
          <li>בסיום הפעילות מעבירים את האירוע לארכיון במקום למחוק אותו.</li>
        </ol>
      </Card>

      <Link href="/admin/teams" className="w-full">
        <Card className="hover:border-brand-gold/60 transition-colors flex items-center justify-between">
          <div>
            <div className="font-bold text-lg">שאלות מהצוותים</div>
            <p className="text-brand-muted text-sm mt-1">איסוף שאלות אנונימי לכל צוות בפלוגה</p>
          </div>
          <span className="text-brand-gold text-xl">←</span>
        </Card>
      </Link>

      <Card className="w-full">
        <NewEventForm />
      </Card>

      <section className="w-full flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-black text-xl">אירועים פעילים</h2>
          <span className="text-brand-muted text-sm">{activeEvents.length}</span>
        </div>
        {activeEvents.map((e) => (
          <Card key={e.id} className="flex items-center justify-between gap-4">
            <Link href={`/admin/events/${e.id}`} className="flex-1 min-w-0">
              <div className="font-bold text-lg truncate">{e.name}</div>
              <div className="text-brand-muted text-sm">
                {e._count.rounds} סבבים · {e._count.sessions} הרצות
              </div>
            </Link>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Link href={`/admin/events/${e.id}`} className="text-brand-gold underline text-sm">
                עריכה
              </Link>
              <form action={archiveEvent.bind(null, e.id)}>
                <button type="submit" className="text-brand-muted hover:text-brand-white underline text-sm">
                  העבר לארכיון
                </button>
              </form>
              <DeleteEventButton eventId={e.id} eventName={e.name} />
            </div>
          </Card>
        ))}
        {activeEvents.length === 0 && <p className="text-brand-muted text-center">אין אירועים פעילים</p>}
      </section>

      <section className="w-full flex flex-col gap-3 border-t border-white/10 pt-5">
        <div className="flex items-center justify-between">
          <h2 className="font-black text-xl">ארכיון</h2>
          <span className="text-brand-muted text-sm">{archivedEvents.length}</span>
        </div>
        <p className="text-brand-muted text-sm -mt-2">אירועים בארכיון נשמרים עם כל השאלות וההרצות, אך לא מופיעים במסך פתיחת חדר.</p>
        {archivedEvents.map((e) => (
          <Card key={e.id} className="flex items-center justify-between gap-4 opacity-80">
            <div className="flex-1 min-w-0">
              <div className="font-bold text-lg truncate">{e.name}</div>
              <div className="text-brand-muted text-sm">
                {e._count.rounds} סבבים · {e._count.sessions} הרצות
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Link href={`/admin/events/${e.id}`} className="text-brand-gold underline text-sm">
                צפייה ועריכה
              </Link>
              <form action={restoreEvent.bind(null, e.id)}>
                <button type="submit" className="text-brand-gold underline text-sm">
                  החזר לפעילים
                </button>
              </form>
            </div>
          </Card>
        ))}
        {archivedEvents.length === 0 && <p className="text-brand-muted text-center">הארכיון ריק</p>}
      </section>

      <Link href="/host" className="text-brand-muted underline text-sm">
        חזרה למסך מנחה
      </Link>
    </main>
  );
}
