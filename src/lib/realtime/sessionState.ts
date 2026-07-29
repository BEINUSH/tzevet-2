import { prisma } from "@/lib/prisma";
import type {
  MostLikelyResult,
  PublicSessionState,
  RoundResultPayload,
  RoundType,
} from "@/types/game";

function roundImageUrl(config: string | null): string | null {
  if (!config) return null;
  try {
    const parsed = JSON.parse(config) as { imageUrl?: unknown };
    return typeof parsed.imageUrl === "string" ? parsed.imageUrl : null;
  } catch {
    return null;
  }
}

export async function getSessionByCode(code: string) {
  return prisma.session.findUnique({ where: { joinCode: code.toUpperCase() } });
}

export async function buildPublicState(sessionId: string): Promise<PublicSessionState | null> {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) return null;

  const event = await prisma.event.findUnique({
    where: { id: session.eventId },
    include: { rounds: { orderBy: { order: "asc" }, include: { options: { orderBy: { order: "asc" } } } } },
  });
  if (!event) return null;

  let orderedRounds = event.rounds;
  if (session.roundOrderJson) {
    try {
      const ids = JSON.parse(session.roundOrderJson) as string[];
      const positions = new Map(ids.map((id, index) => [id, index]));
      orderedRounds = event.rounds
        .filter((round) => positions.has(round.id))
        .sort((a, b) => positions.get(a.id)! - positions.get(b.id)!);
    } catch {
      // Older or malformed sessions keep the event's normal order.
    }
  }

  const participantsRaw = await prisma.participant.findMany({
    where: { sessionId, removed: false },
    orderBy: { joinedAt: "asc" },
  });
  const participants = participantsRaw.map((p) => ({
    id: p.id,
    name: p.name,
    teamNumber: p.teamNumber,
    connected: p.connected,
    score: p.score,
  }));

  const totalRounds = orderedRounds.length;
  const currentRound = orderedRounds[session.currentRoundIndex] ?? null;

  let votesCast = 0;
  let votesNeeded = participantsRaw.filter((p) => p.connected).length;
  let result: RoundResultPayload | null = null;

  if (currentRound) {
    if (currentRound.type === "ANONYMOUS_PROMPT") {
      votesCast = await prisma.anonymousAnswer.count({
        where: { sessionId, roundId: currentRound.id },
      });
    } else {
      votesCast = await prisma.vote.count({ where: { sessionId, roundId: currentRound.id } });
    }

    if (session.currentRoundPhase === "REVEALED" || session.currentRoundPhase === "DONE") {
      const stored = await prisma.roundResult.findUnique({
        where: { sessionId_roundId: { sessionId, roundId: currentRound.id } },
      });
      if (stored) result = JSON.parse(stored.resultJson) as RoundResultPayload;
    }
  }

  let finalLeaderboard = null as PublicSessionState["finalLeaderboard"];
  if (session.status === "FINAL_AWARDS" || session.status === "ENDED") {
    finalLeaderboard = [...participants].sort((a, b) => b.score - a.score);
  }

  let allAwards: PublicSessionState["allAwards"] = null;
  if (session.status === "FINAL_AWARDS" || session.status === "ENDED") {
    const awardRounds = orderedRounds.filter((r) => r.type === "AWARDS");
    const results = await prisma.roundResult.findMany({
      where: { sessionId, roundId: { in: awardRounds.map((r) => r.id) } },
    });
    const byRoundId = new Map(results.map((r) => [r.roundId, r]));
    allAwards = awardRounds.map((r) => {
      const stored = byRoundId.get(r.id);
      const parsed = stored ? (JSON.parse(stored.resultJson) as MostLikelyResult) : null;
      const winners =
        parsed && parsed.maxVotes > 0
          ? parsed.tally.filter((t) => parsed.winnerKeys.includes(t.key)).map((t) => t.label)
          : [];
      return { roundTitle: r.title ?? r.questionText, winners };
    });
  }

  return {
    code: session.joinCode,
    eventName: event.name,
    status: session.status as PublicSessionState["status"],
    roundIndex: session.currentRoundIndex,
    totalRounds,
    roundPhase: session.currentRoundPhase as PublicSessionState["roundPhase"],
    votingOpenedAt: session.votingOpenedAt ? session.votingOpenedAt.toISOString() : null,
    round: currentRound
      ? {
          id: currentRound.id,
          type: currentRound.type as RoundType,
          title: currentRound.title,
          questionText: currentRound.questionText,
          imageUrl: roundImageUrl(currentRound.config),
          timeLimitSec: currentRound.timeLimitSec,
          allowSelfVote: currentRound.allowSelfVote,
          scoringEnabled: currentRound.scoringEnabled,
          order: currentRound.order,
          options: currentRound.options.map((o) => ({ id: o.id, text: o.text, order: o.order })),
        }
      : null,
    participants,
    votesCast,
    votesNeeded,
    result,
    showLeaderboard: session.showLeaderboard,
    finalLeaderboard,
    allAwards,
  };
}
