import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CaptainsPage() {
  const teams = await prisma.team.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: { id: true, name: true, _count: { select: { members: true, submissions: true } } },
  });

  return (
    <main className="min-h-screen flex flex-col items-center px-5 py-10 gap-6" dir="rtl">
      <div className="text-center max-w-2xl">
        <div className="text-brand-gold font-bold mb-2">פלוגה א׳ · שליטת מנהל</div>
        <h1 className="text-3xl sm:text-4xl font-black">קישורים למפקדי הצוותים</h1>
        <p className="text-brand-muted mt-3">השמות שכבר הוזנו נשמרים במערכת. מסך הזנת השמות הוסר מתצוגת המפק״צים. שלח לכל מפק״צ רק את הקישור של הצוות שלו.</p>
      </div>
      <div className="w-full max-w-2xl flex flex-col gap-3">
        {teams.map((team) => (
          <div key={team.id} className="rounded-2xl border border-brand-gold/20 p-5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div>
              <div className="font-black text-xl">{team.name}</div>
              <div className="text-brand-muted text-sm">{team._count.members} שמות שמורים · {team._count.submissions}/15 שאלות</div>
            </div>
            <Link href={`/captains/${team.id}`} className="rounded-xl bg-brand-gold text-brand-navy font-bold px-5 py-3 text-center">פתח קישור למפק״צ</Link>
          </div>
        ))}
      </div>
      <p className="text-brand-muted text-sm text-center max-w-xl">שים לב: הקישורים מבודדים את ממשק הצוותים זה מזה, אבל מי שמקבל קישור של צוות אחר יוכל לפתוח אותו. לכן שלח לכל מפק״צ רק את הקישור הייעודי שלו.</p>
    </main>
  );
}
