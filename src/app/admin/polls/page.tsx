import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { addPollToEvent } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminPollsPage() {
  const [polls, events] = await Promise.all([
    prisma.companyPoll.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.event.findMany({
      where: { archivedAt: null },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true },
    }),
  ]);

  return <main className="flex-1 flex flex-col px-6 py-10 gap-5 max-w-2xl mx-auto w-full" dir="rtl">
    <Link href="/admin/teams" className="text-brand-muted text-sm">← חזרה לצוותים</Link>
    <h1 className="text-3xl font-black gold-text">סקרים פלוגתיים</h1>
    <p className="text-brand-muted">בחרו אירוע והוסיפו אליו סקר מוכן. סקרים אינם כוללים תשובה נכונה ואינם מעניקים ניקוד.</p>
    {polls.map((p) => {
      let options: string[] = [];
      try { options = JSON.parse(p.optionsJson); } catch {}
      return <Card key={p.id}>
        <div className="font-black text-lg">{p.questionText}</div>
        <div className="text-brand-muted text-sm mt-1">נשלח על ידי: {p.createdByTeam || "לא צוין"}</div>
        <ol className="list-decimal list-inside mt-3 space-y-1">{options.map((o, i) => <li key={i}>{o}</li>)}</ol>

        {events.length > 0 ? (
          <form action={addPollToEvent} className="mt-5 flex flex-col sm:flex-row gap-2">
            <input type="hidden" name="pollId" value={p.id} />
            <select
              name="eventId"
              required
              defaultValue={events[0]?.id}
              aria-label="בחירת אירוע"
              className="flex-1 rounded-xl bg-brand-navy-lighter border border-brand-gold/20 px-3 py-2 focus:outline-none focus:border-brand-gold"
            >
              {events.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}
            </select>
            <button
              type="submit"
              className="rounded-xl bg-brand-gold px-4 py-2 font-black text-brand-navy transition hover:brightness-110"
            >
              הוספה למשחק
            </button>
          </form>
        ) : (
          <p className="mt-4 text-sm text-brand-danger">אין כרגע אירוע פעיל שאליו ניתן להוסיף את הסקר.</p>
        )}
      </Card>;
    })}
    {!polls.length && <p className="text-brand-muted text-center">עדיין לא נשלחו סקרים</p>}
  </main>;
}
