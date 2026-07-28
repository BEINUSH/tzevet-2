import { prisma } from "@/lib/prisma";
import { CaptainForm } from "./CaptainForm";

export const dynamic = "force-dynamic";

export default async function CaptainsPage() {
  const teams = await prisma.team.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });

  return (
    <main className="min-h-screen flex flex-col items-center px-5 py-10 gap-6" dir="rtl">
      <div className="text-center max-w-2xl">
        <div className="text-brand-gold font-bold mb-2">פלוגה א׳ · צוותים 1, 2, 3</div>
        <h1 className="text-3xl sm:text-4xl font-black">הכנת תוכן לערב הפלוגתי</h1>
        <p className="text-brand-muted mt-3">מיועד למפקדי הצוותים. בחר את הצוות שלך, הזן את כל אנשי הצוות כולל המפק״צ, שאלות עם תשובות, ורעיונות לסקרים לכל הפלוגה.</p>
      </div>
      {teams.length ? <CaptainForm teams={teams} /> : <div className="rounded-2xl border border-brand-gold/20 p-6 text-center">עדיין לא הוגדרו צוותים. יש ליצור תחילה את צוותים 1, 2 ו־3 בממשק הניהול.</div>}
    </main>
  );
}
