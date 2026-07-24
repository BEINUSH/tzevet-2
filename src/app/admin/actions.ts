"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { DEFAULT_SCORING_ENABLED, OPTION_BASED_TYPES, type RoundType } from "@/types/game";
import { csvToRounds } from "@/lib/eventCsv";

function defaultOptionsFor(type: RoundType): { text: string; isCorrect: boolean }[] {
  if (type === "HEAD_TO_HEAD") {
    return [
      { text: "מתמודד/ת א׳", isCorrect: false },
      { text: "מתמודד/ת ב׳", isCorrect: false },
    ];
  }
  if (OPTION_BASED_TYPES.includes(type)) {
    return [
      { text: "", isCorrect: true },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
    ];
  }
  return [];
}

export async function createEvent(name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("שם האירוע לא יכול להיות ריק");
  const event = await prisma.event.create({ data: { name: trimmed } });
  revalidatePath("/admin");
  return event.id;
}

export async function renameEvent(eventId: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("שם האירוע לא יכול להיות ריק");
  await prisma.event.update({ where: { id: eventId }, data: { name: trimmed } });
  revalidatePath("/admin");
  revalidatePath(`/admin/events/${eventId}`);
}

export async function deleteEvent(eventId: string) {
  await prisma.event.delete({ where: { id: eventId } });
  revalidatePath("/admin");
}

export async function updateEventDefaults(eventId: string, allowSelfVoteDefault: boolean, soundEnabled: boolean) {
  await prisma.event.update({ where: { id: eventId }, data: { allowSelfVoteDefault, soundEnabled } });
  revalidatePath(`/admin/events/${eventId}`);
}

export async function createRound(eventId: string, type: RoundType) {
  const maxOrder = await prisma.round.aggregate({
    where: { eventId },
    _max: { order: true },
  });
  const order = (maxOrder._max.order ?? -1) + 1;
  const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId } });

  const round = await prisma.round.create({
    data: {
      eventId,
      type,
      order,
      questionText: "",
      allowSelfVote: event.allowSelfVoteDefault,
      scoringEnabled: DEFAULT_SCORING_ENABLED[type],
      timeLimitSec: type === "ANONYMOUS_PROMPT" ? 60 : 20,
      options: {
        create: defaultOptionsFor(type).map((o, idx) => ({ text: o.text, isCorrect: o.isCorrect, order: idx })),
      },
    },
  });
  revalidatePath(`/admin/events/${eventId}`);
  return round.id;
}

export async function updateRound(
  roundId: string,
  data: {
    title?: string | null;
    questionText: string;
    timeLimitSec: number | null;
    allowSelfVote: boolean;
    scoringEnabled: boolean;
    imageUrl?: string | null;
  }
) {
  const { imageUrl, ...roundData } = data;
  const round = await prisma.round.update({
    where: { id: roundId },
    data: {
      ...roundData,
      ...(imageUrl !== undefined
        ? { config: imageUrl ? JSON.stringify({ imageUrl }) : null }
        : {}),
    },
  });
  revalidatePath(`/admin/events/${round.eventId}`);
}

export async function deleteRound(roundId: string) {
  const round = await prisma.round.delete({ where: { id: roundId } });
  revalidatePath(`/admin/events/${round.eventId}`);
}

export async function reorderRounds(eventId: string, orderedRoundIds: string[]) {
  await prisma.$transaction(
    orderedRoundIds.map((id, index) => prisma.round.update({ where: { id }, data: { order: index } }))
  );
  revalidatePath(`/admin/events/${eventId}`);
}

export async function importRoundsFromCsv(
  eventId: string,
  formData: FormData
): Promise<{ ok: boolean; errors: string[]; importedCount?: number }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, errors: ["לא נבחר קובץ"] };
  }
  const text = await file.text();
  const { rounds, errors } = csvToRounds(text);
  if (errors.length) {
    return { ok: false, errors };
  }

  await prisma.$transaction([
    prisma.round.deleteMany({ where: { eventId } }),
    ...rounds.map((r, order) =>
      prisma.round.create({
        data: {
          eventId,
          type: r.type,
          order,
          title: r.title,
          questionText: r.questionText,
          timeLimitSec: r.timeLimitSec,
          allowSelfVote: r.allowSelfVote,
          scoringEnabled: r.scoringEnabled,
          config: r.imageUrl ? JSON.stringify({ imageUrl: r.imageUrl }) : null,
          options: {
            create: r.options.map((o, idx) => ({ text: o.text, isCorrect: o.isCorrect, order: idx })),
          },
        },
      })
    ),
  ]);

  revalidatePath(`/admin/events/${eventId}`);
  return { ok: true, errors: [], importedCount: rounds.length };
}

export async function replaceOptions(
  roundId: string,
  options: { text: string; isCorrect: boolean }[]
) {
  const round = await prisma.round.findUniqueOrThrow({ where: { id: roundId } });
  await prisma.$transaction([
    prisma.option.deleteMany({ where: { roundId } }),
    prisma.option.createMany({
      data: options.map((o, idx) => ({ roundId, text: o.text, isCorrect: o.isCorrect, order: idx })),
    }),
  ]);
  revalidatePath(`/admin/events/${round.eventId}`);
}
