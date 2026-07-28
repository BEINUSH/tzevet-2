import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { NewTeamForm } from "./NewTeamForm";
import { DeleteTeamButton } from "./DeleteTeamButton";

export const dynamic = "force-dynamic";

export default async function AdminTeamsPage() {
  const teams = await prisma.team.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: { _count: { select: { submissions: true } } },
  });

  return (
    <main className="flex-1 flex flex-col items-center px-6 py-10 gap-6 max-w-2xl mx-auto w-full">
      <Link href="/admin" className="self-start text-brand-muted hover:text-brand-white text-sm">
        ← חזרה לניהול תוכן
      </Link>

      <h1 className="text-3xl font-black gold-text">שאלות מהצוותים</h1>
      <p className="text-brand-muted text-center -mt-4">
        כל צוות יכול לשלוח עד 15 שאלות על עצמו דרך{" "}
        <Link href="/submit" className="text-brand-gold underline">
          /submit
        </Link>
        , בלי לראות שאלות של צוותים אחרים.
      </p>

      <Card className="w-full">
        <NewTeamForm />
      </Card>

      <div className="w-full flex flex-col gap-3">
        {teams.map((t) => (
          <Card key={t.id} className="flex items-center justify-between gap-4">
            <Link href={`/admin/teams/${t.id}`} className="flex-1">
              <div className="font-bold text-lg">{t.name}</div>
              <div className="text-brand-muted text-sm">{t._count.submissions} מתוך 15 שאלות</div>
            </Link>
            <div className="flex gap-2">
              <Link href={`/admin/teams/${t.id}`} className="text-brand-gold underline text-sm">
                צפייה
              </Link>
              <DeleteTeamButton teamId={t.id} teamName={t.name} />
            </div>
          </Card>
        ))}
        {teams.length === 0 && <p className="text-brand-muted text-center">אין עדיין צוותים</p>}
      </div>
    </main>
  );
}
