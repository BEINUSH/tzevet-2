import type { Option, Participant, Round, Vote } from "@prisma/client";
import { prisma } from "./prisma";
import type {
  ChoiceResult,
  HeadToHeadResult,
  MostLikelyResult,
  TallyEntry,
} from "@/types/game";

const SPEED_BONUS = [5, 3, 1]; // bonus for 1st/2nd/3rd correct answer
const BASE_CORRECT_POINTS = 10;
const HEAD_TO_HEAD_POINTS = 10;

export function computeMostLikelyResult(
  round: Round,
  participants: Participant[],
  votes: Vote[]
): MostLikelyResult {
  const tallyMap = new Map<string, number>();
  for (const p of participants) tallyMap.set(p.id, 0);
  for (const v of votes) {
    if (!v.targetParticipantId) continue;
    tallyMap.set(v.targetParticipantId, (tallyMap.get(v.targetParticipantId) ?? 0) + 1);
  }
  const tally: TallyEntry[] = participants
    .map((p) => ({ key: p.id, label: p.name, votes: tallyMap.get(p.id) ?? 0 }))
    .sort((a, b) => b.votes - a.votes);
  const maxVotes = tally.length ? tally[0].votes : 0;
  const winnerKeys = maxVotes > 0 ? tally.filter((t) => t.votes === maxVotes).map((t) => t.key) : [];
  return {
    kind: round.type === "AWARDS" ? "AWARDS" : "MOST_LIKELY",
    tally,
    winnerKeys,
    maxVotes,
  };
}

export function computeChoiceResult(
  round: Round,
  options: Option[],
  votes: Vote[]
): ChoiceResult {
  const tallyMap = new Map<string, number>();
  for (const o of options) tallyMap.set(o.id, 0);
  const voteOrder: { optionId: string; participantId: string; createdAt: Date }[] = [];
  for (const v of votes) {
    if (!v.optionId) continue;
    tallyMap.set(v.optionId, (tallyMap.get(v.optionId) ?? 0) + 1);
    voteOrder.push({ optionId: v.optionId, participantId: v.participantId, createdAt: v.createdAt });
  }
  const correctOption = options.find((o) => o.isCorrect) ?? null;
  const tally: TallyEntry[] = options
    .sort((a, b) => a.order - b.order)
    .map((o) => ({ key: o.id, label: o.text, votes: tallyMap.get(o.id) ?? 0, isCorrect: o.isCorrect }));

  const scored: Record<string, number> = {};
  if (round.scoringEnabled && correctOption) {
    const correctVotesInOrder = voteOrder
      .filter((v) => v.optionId === correctOption.id)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    correctVotesInOrder.forEach((v, idx) => {
      const bonus = SPEED_BONUS[idx] ?? 0;
      scored[v.participantId] = BASE_CORRECT_POINTS + bonus;
    });
  }

  return {
    kind: round.type === "WHO_SAID_IT" ? "WHO_SAID_IT" : "TRIVIA",
    tally,
    correctOptionId: correctOption?.id ?? null,
    scored,
  };
}

export function computeHeadToHeadBetting(options: Option[], votes: Vote[]): HeadToHeadResult {
  const tallyMap = new Map<string, number>();
  for (const o of options) tallyMap.set(o.id, 0);
  for (const v of votes) {
    if (!v.optionId) continue;
    tallyMap.set(v.optionId, (tallyMap.get(v.optionId) ?? 0) + 1);
  }
  const contestants = options
    .sort((a, b) => a.order - b.order)
    .map((o) => ({ optionId: o.id, name: o.text, votes: tallyMap.get(o.id) ?? 0 }));
  return { kind: "HEAD_TO_HEAD", contestants, winnerOptionId: null, scored: {} };
}

export function applyHeadToHeadWinner(
  base: HeadToHeadResult,
  votes: Vote[],
  winnerOptionId: string,
  scoringEnabled: boolean
): HeadToHeadResult {
  const scored: Record<string, number> = {};
  if (scoringEnabled) {
    for (const v of votes) {
      if (v.optionId === winnerOptionId) scored[v.participantId] = HEAD_TO_HEAD_POINTS;
    }
  }
  return { ...base, winnerOptionId, scored };
}

export async function applyScoring(sessionId: string, scored: Record<string, number>) {
  const entries = Object.entries(scored).filter(([, pts]) => pts !== 0);
  if (!entries.length) return;
  await prisma.$transaction(
    entries.map(([participantId, points]) =>
      prisma.participant.update({
        where: { id: participantId },
        data: { score: { increment: points } },
      })
    )
  );
}
