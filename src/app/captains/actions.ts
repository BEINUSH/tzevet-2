"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const MAX_QUESTIONS = 15;

export async function getCaptainTeam(teamId: string) {
  return prisma.team.findUnique({
    where: { id: teamId },
    include: {
      members: { orderBy: [{ isCommander: "desc" }, { order: "asc" }, { name: "asc" }] },
      submissions: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function addMember(teamId: string, name: string, isCommander = false) {
  const clean = name.trim();
  if (!clean) return { ok: false, error: "יש להזין שם" };
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) return { ok: false, error: "הצוות לא נמצא" };
  const count = await prisma.teamMember.count({ where: { teamId } });
  await prisma.teamMember.create({ data: { teamId, name: clean, isCommander, order: count } });
  revalidatePath("/captains");
  return { ok: true };
}

export async function deleteMember(memberId: string) {
  await prisma.teamMember.delete({ where: { id: memberId } });
  revalidatePath("/captains");
  return { ok: true };
}

export async function addQuestion(teamId: string, question: string, answer: string) {
  const q = question.trim();
  const a = answer.trim();
  if (!q || !a) return { ok: false, error: "יש להזין גם שאלה וגם תשובה" };
  const count = await prisma.questionSubmission.count({ where: { teamId } });
  if (count >= MAX_QUESTIONS) return { ok: false, error: "הגעתם למכסה של 15 שאלות" };
  await prisma.questionSubmission.create({ data: { teamId, questionText: q, answerText: a } });
  revalidatePath("/captains");
  return { ok: true };
}

export async function deleteQuestion(id: string) {
  await prisma.questionSubmission.delete({ where: { id } });
  revalidatePath("/captains");
  return { ok: true };
}

export async function addCompanyPoll(teamName: string, question: string, options: string[]) {
  const q = question.trim();
  const cleanOptions = options.map((x) => x.trim()).filter(Boolean);
  if (!q || cleanOptions.length < 2) return { ok: false, error: "לסקר דרושות שאלה ולפחות שתי אפשרויות" };
  await prisma.companyPoll.create({
    data: { questionText: q, optionsJson: JSON.stringify(cleanOptions), createdByTeam: teamName },
  });
  revalidatePath("/captains");
  return { ok: true };
}
