import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EventEditor } from "./EventEditor";

export const dynamic = "force-dynamic";

export default async function EventEditPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { rounds: { orderBy: { order: "asc" }, include: { options: { orderBy: { order: "asc" } } } } },
  });
  if (!event) notFound();

  return <EventEditor event={event} />;
}
