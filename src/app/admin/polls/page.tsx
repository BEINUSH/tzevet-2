import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

export default async function AdminPollsPage() {
  const polls = await prisma.companyPoll.findMany({ orderBy: { createdAt: "desc" } });
  return <main className="flex-1 flex flex-col px-6 py-10 gap-5 max-w-2xl mx-auto w-full" dir="rtl">
    <Link href="/admin/teams" className="text-brand-muted text-sm">← חזרה לצוותים</Link>
    <h1 className="text-3xl font-black gold-text">סקרים פלוגתיים</h1>
    <p className="text-brand-muted">רעיונות לסקרים עבור כל פלוגה א׳ — צוותים 1, 2 ו־3.</p>
    {polls.map((p) => {
      let options: string[] = [];
      try { options = JSON.parse(p.optionsJson); } catch {}
      return <Card key={p.id}>
        <div className="font-black text-lg">{p.questionText}</div>
        <div className="text-brand-muted text-sm mt-1">נשלח על ידי: {p.createdByTeam || "לא צוין"}</div>
        <ol className="list-decimal list-inside mt-3 space-y-1">{options.map((o, i) => <li key={i}>{o}</li>)}</ol>
      </Card>;
    })}
    {!polls.length && <p className="text-brand-muted text-center">עדיין לא נשלחו סקרים</p>}
  </main>;
}
