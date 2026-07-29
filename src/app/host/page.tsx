import { prisma } from "@/lib/prisma";
import { HostLanding } from "./HostLanding";

export const dynamic = "force-dynamic";

export default async function HostPage() {
  const events = await prisma.event.findMany({
    where: { archivedAt: null },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { rounds: true } } },
  });

  return (
    <HostLanding
      events={events.map((e) => ({ id: e.id, name: e.name, roundCount: e._count.rounds }))}
    />
  );
}
