"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function addPollToEvent(formData: FormData) {
  const pollId = String(formData.get("pollId") || "");
  const eventId = String(formData.get("eventId") || "");
  if (!pollId || !eventId) throw new Error("יש לבחור אירוע");

  const [poll, event, maxOrder] = await Promise.all([
    prisma.companyPoll.findUnique({ where: { id: pollId } }),
    prisma.event.findFirst({ where: { id: eventId, archivedAt: null } }),
    prisma.round.aggregate({ where: { eventId }, _max: { order: true } }),
  ]);
  if (!poll) throw new Error("הסקר לא נמצא");
  if (!event) throw new Error("האירוע לא נמצא או הועבר לארכיון");

  let options: string[] = [];
  try {
    options = JSON.parse(poll.optionsJson);
  } catch {
    throw new Error("אפשרויות הסקר אינן תקינות");
  }
  options = options.map((option) => String(option).trim()).filter(Boolean);
  if (options.length < 2) throw new Error("לסקר דרושות לפחות שתי אפשרויות");

  await prisma.round.create({
    data: {
      eventId,
      type: "POLL",
      order: (maxOrder._max.order ?? -1) + 1,
      title: "סקר פלוגתי",
      questionText: poll.questionText,
      timeLimitSec: 20,
      allowSelfVote: false,
      scoringEnabled: false,
      options: {
        create: options.map((text, order) => ({ text, order, isCorrect: false })),
      },
    },
  });

  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath("/admin/polls");
  redirect(`/admin/events/${eventId}`);
}
