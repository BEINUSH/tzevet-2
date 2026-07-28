import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { DeleteSubmissionButton } from "./DeleteSubmissionButton";

export const dynamic = "force-dynamic";

export default async function AdminTeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      submissions: { orderBy: { createdAt: "asc" } },
      members: { orderBy: [{ isCommander: "desc" }, { order: "asc" }, { name: "asc" }] },
    },
  });
  if (!team) notFound();

  return (
    <main className="flex-1 flex flex-col items-center px-6 py-10 gap-6 max-w-2xl mx-auto w-full">
      <Link href="/admin/teams" className="self-start text-brand-muted hover:text-brand-white text-sm">← חזרה לצוותים</Link>
      <h1 className="text-3xl font-black gold-text">{team.name}</h1>

      <section className="w-full">
        <h2 className="text-xl font-black mb-3">אנשי הצוות ({team.members.length})</h2>
        <Card className="flex flex-wrap gap-2">
          {team.members.map((m) => <span key={m.id} className="rounded-full border border-brand-gold/20 px-3 py-2">{m.isCommander ? "מפק״צ · " : ""}{m.name}</span>)}
          {!team.members.length && <span className="text-brand-muted">טרם הוזנו אנשי צוות</span>}
        </Card>
      </section>

      <section className="w-full">
        <h2 className="text-xl font-black mb-1">שאלות ותשובות</h2>
        <p className="text-brand-muted mb-3">{team.submissions.length} מתוך 15 שאלות</p>
        <div className="flex flex-col gap-3">
          {team.submissions.map((s, index) => (
            <Card key={s.id} className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-lg font-bold"><span className="text-brand-muted ml-2">{index + 1}.</span>{s.questionText}</p>
                <p className="text-brand-muted mt-1">תשובה: {s.answerText || "לא הוזנה תשובה"}</p>
              </div>
              <DeleteSubmissionButton submissionId={s.id} />
            </Card>
          ))}
          {!team.submissions.length && <p className="text-brand-muted text-center">עדיין לא נשלחו שאלות</p>}
        </div>
      </section>
    </main>
  );
}
