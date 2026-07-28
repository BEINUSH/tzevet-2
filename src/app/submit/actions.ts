"use server";

import { prisma } from "@/lib/prisma";
import { MAX_QUESTIONS_PER_TEAM } from "./constants";

export async function getTeamStatus(teamId: string): Promise<{ count: number; remaining: number }> {
  const count = await prisma.questionSubmission.count({ where: { teamId } });
  return { count, remaining: Math.max(0, MAX_QUESTIONS_PER_TEAM - count) };
}

export async function submitQuestion(
  teamId: string,
  questionText: string
): Promise<{ ok: boolean; error?: string; count?: number; remaining?: number }> {
  const trimmed = questionText.trim();
  if (!trimmed) return { ok: false, error: "השאלה לא יכולה להיות ריקה" };
  if (trimmed.length > 500) return { ok: false, error: "השאלה ארוכה מדי" };

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) return { ok: false, error: "הצוות לא נמצא" };

  const result = await prisma.$transaction(async (tx) => {
    const count = await tx.questionSubmission.count({ where: { teamId } });
    if (count >= MAX_QUESTIONS_PER_TEAM) return null;
    await tx.questionSubmission.create({ data: { teamId, questionText: trimmed } });
    return count + 1;
  });

  if (result === null) {
    return { ok: false, error: `הצוות כבר הגיע למכסה של ${MAX_QUESTIONS_PER_TEAM} שאלות`, count: MAX_QUESTIONS_PER_TEAM, remaining: 0 };
  }

  return { ok: true, count: result, remaining: Math.max(0, MAX_QUESTIONS_PER_TEAM - result) };
}
