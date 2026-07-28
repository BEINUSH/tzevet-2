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
    include: { submissions: { orderBy: { createdAt: "asc" } } },
  });
  if (!team) notFound();

  return (
    <main className="flex-1 flex flex-col items-center px-6 py-10 gap-6 max-w-2xl mx-auto w-full">
      <Link href="/admin/teams" className="self-start text-brand-muted hover:text-brand-white text-sm">
        ← חזרה לצוותים
      </Link>

      <h1 className="text-3xl font-black gold-text">{team.name}</h1>
      <p className="text-brand-muted -mt-4">{team.submissions.length} מתוך 15 שאלות</p>

      <div className="w-full flex flex-col gap-3">
        {team.submissions.map((s, index) => (
          <Card key={s.id} className="flex items-start justify-between gap-4">
            <p className="flex-1 text-lg">
              <span className="text-brand-muted ml-2">{index + 1}.</span>
              {s.questionText}
            </p>
            <DeleteSubmissionButton submissionId={s.id} />
          </Card>
        ))}
        {team.submissions.length === 0 && <p className="text-brand-muted text-center">עדיין לא נשלחו שאלות</p>}
      </div>
    </main>
  );
}
