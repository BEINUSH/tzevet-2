import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CaptainTeamForm } from "./CaptainTeamForm";

export const dynamic = "force-dynamic";

export default async function CaptainTeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true, name: true },
  });
  if (!team) notFound();

  return (
    <main className="min-h-screen flex flex-col items-center px-5 py-10 gap-6" dir="rtl">
      <div className="text-center max-w-2xl">
        <div className="text-brand-gold font-bold mb-2">פלוגה א׳ · {team.name}</div>
        <h1 className="text-3xl sm:text-4xl font-black">הכנת שאלות לערב הפלוגתי</h1>
        <p className="text-brand-muted mt-3">הקישור הזה מיועד למפקד {team.name}. אפשר להוסיף, לראות ולמחוק רק את השאלות של הצוות הזה.</p>
      </div>
      <CaptainTeamForm team={team} />
    </main>
  );
}
