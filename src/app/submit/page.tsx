import { prisma } from "@/lib/prisma";
import { SubmitForm } from "./SubmitForm";

export const dynamic = "force-dynamic";

export default async function SubmitPage() {
  const teams = await prisma.team.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-6 px-4 sm:px-6 py-10 text-center">
      <div>
        <div className="text-5xl mb-2">✍️</div>
        <h1 className="text-3xl font-black gold-text">שאלות על הצוות שלכם</h1>
        <p className="text-brand-muted mt-2 max-w-sm">
          בחרו את הצוות שלכם והוסיפו שאלות עליו למשחק. עד 15 שאלות לצוות בסך הכול. השליחה אנונימית — לא נשמר מי כתב מה.
        </p>
      </div>
      <SubmitForm teams={teams} />
    </main>
  );
}
