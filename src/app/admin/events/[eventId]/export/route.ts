import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { roundsToCsv } from "@/lib/eventCsv";

export async function GET(_req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { rounds: { orderBy: { order: "asc" }, include: { options: { orderBy: { order: "asc" } } } } },
  });
  if (!event) return NextResponse.json({ error: "האירוע לא נמצא" }, { status: 404 });

  const csv = roundsToCsv(event.rounds);
  const filename = `${event.name.replace(/[^\w֐-׿ ]/g, "")}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="event.csv"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
