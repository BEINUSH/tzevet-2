"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function createTeam(name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("שם הצוות לא יכול להיות ריק");
  const maxOrder = await prisma.team.aggregate({ _max: { order: true } });
  const team = await prisma.team.create({
    data: { name: trimmed, order: (maxOrder._max.order ?? -1) + 1 },
  });
  revalidatePath("/admin/teams");
  revalidatePath("/submit");
  return team.id;
}

export async function deleteTeam(teamId: string) {
  await prisma.team.delete({ where: { id: teamId } });
  revalidatePath("/admin/teams");
  revalidatePath("/submit");
}

export async function deleteSubmission(submissionId: string) {
  const submission = await prisma.questionSubmission.delete({ where: { id: submissionId } });
  revalidatePath(`/admin/teams/${submission.teamId}`);
  revalidatePath("/admin/teams");
}
