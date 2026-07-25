import type { Server, Socket } from "socket.io";
import { prisma } from "@/lib/prisma";
import { withLock } from "@/lib/mutex";
import { generateDeviceToken, generateHostToken, generateJoinCode } from "@/lib/ids";
import { buildPublicState, getSessionByCode } from "./sessionState";
import {
  applyHeadToHeadWinner,
  applyScoring,
  computeChoiceResult,
  computeHeadToHeadBetting,
  computeMostLikelyResult,
} from "@/lib/results";
import { MAX_PARTICIPANTS, OPTION_BASED_TYPES, PARTICIPANT_TARGET_TYPES } from "@/types/game";
import type { AnonymousPromptResult } from "@/types/game";
import { clearAutoClose, scheduleAutoClose } from "./timers";

function roomName(sessionId: string) {
  return `session:${sessionId}`;
}

async function broadcast(io: Server, sessionId: string) {
  const state = await buildPublicState(sessionId);
  if (state) io.to(roomName(sessionId)).emit("state", state);
}

async function getEventRounds(eventId: string, roundOrderJson?: string | null) {
  const rounds = await prisma.round.findMany({
    where: { eventId },
    orderBy: { order: "asc" },
    include: { options: { orderBy: { order: "asc" } } },
  });
  if (!roundOrderJson) return rounds;
  try {
    const ids = JSON.parse(roundOrderJson) as string[];
    const positions = new Map(ids.map((id, index) => [id, index]));
    return [...rounds].sort(
      (a, b) => (positions.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (positions.get(b.id) ?? Number.MAX_SAFE_INTEGER)
    );
  } catch {
    return rounds;
  }
}

async function revealCurrentRoundLocked(sessionId: string) {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session || !["VOTING_OPEN", "VOTING_CLOSED"].includes(session.currentRoundPhase)) return false;

  const rounds = await getEventRounds(session.eventId, session.roundOrderJson);
  const round = rounds[session.currentRoundIndex];
  if (!round) return false;

  const existingResult = await prisma.roundResult.findUnique({
    where: { sessionId_roundId: { sessionId, roundId: round.id } },
  });
  if (existingResult) {
    await prisma.session.update({
      where: { id: sessionId },
      data: { currentRoundPhase: "REVEALED" },
    });
    return true;
  }

  const participants = await prisma.participant.findMany({
    where: { sessionId, removed: false },
  });

  if (PARTICIPANT_TARGET_TYPES.includes(round.type as never)) {
    const votes = await prisma.vote.findMany({ where: { sessionId, roundId: round.id } });
    const resultPayload = computeMostLikelyResult(round, participants, votes);
    await prisma.roundResult.create({
      data: { sessionId, roundId: round.id, resultJson: JSON.stringify(resultPayload) },
    });
  } else if (round.type === "HEAD_TO_HEAD") {
    const votes = await prisma.vote.findMany({ where: { sessionId, roundId: round.id } });
    const resultPayload = computeHeadToHeadBetting(round.options, votes);
    await prisma.roundResult.create({
      data: { sessionId, roundId: round.id, resultJson: JSON.stringify(resultPayload) },
    });
  } else if (OPTION_BASED_TYPES.includes(round.type as never)) {
    const votes = await prisma.vote.findMany({ where: { sessionId, roundId: round.id } });
    const resultPayload = computeChoiceResult(round, round.options, votes);
    await prisma.roundResult.create({
      data: { sessionId, roundId: round.id, resultJson: JSON.stringify(resultPayload) },
    });
    await applyScoring(sessionId, resultPayload.scored);
  } else if (round.type === "ANONYMOUS_PROMPT") {
    const answers = await prisma.anonymousAnswer.findMany({
      where: { sessionId, roundId: round.id },
      orderBy: { createdAt: "asc" },
    });
    const resultPayload: AnonymousPromptResult = {
      kind: "ANONYMOUS_PROMPT",
      answers: answers.map((a) => ({ id: a.id, text: a.text, hidden: a.hidden })),
      shownIndex: 0,
    };
    await prisma.roundResult.create({
      data: { sessionId, roundId: round.id, resultJson: JSON.stringify(resultPayload) },
    });
  }

  await prisma.session.update({
    where: { id: sessionId },
    data: { currentRoundPhase: "REVEALED" },
  });
  return true;
}

async function revealIfEveryoneAnswered(io: Server, sessionId: string, roundId: string) {
  let revealed = false;
  await withLock(sessionId, async () => {
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session || session.currentRoundPhase !== "VOTING_OPEN") return;

    const rounds = await getEventRounds(session.eventId, session.roundOrderJson);
    const round = rounds[session.currentRoundIndex];
    if (!round || round.id !== roundId) return;

    const votesNeeded = await prisma.participant.count({
      where: { sessionId, removed: false, connected: true },
    });
    if (votesNeeded < 1) return;
    const votesCast =
      round.type === "ANONYMOUS_PROMPT"
        ? await prisma.anonymousAnswer.count({ where: { sessionId, roundId } })
        : await prisma.vote.count({ where: { sessionId, roundId } });
    if (votesCast < votesNeeded) return;

    clearAutoClose(sessionId);
    revealed = await revealCurrentRoundLocked(sessionId);
  });
  if (revealed) await broadcast(io, sessionId);
}

type Ack = (response: Record<string, unknown>) => void;
const noop: Ack = () => {};
const DEMO_BOT_NAMES = [
  "🤖 בוט אלפא",
  "🤖 בוט בראבו",
  "🤖 בוט צ׳רלי",
  "🤖 בוט דלתא",
  "🤖 בוט אקו",
  "🤖 בוט פוקסטרוט",
  "🤖 בוט גולף",
  "🤖 בוט הוטל",
  "🤖 בוט אינדיה",
  "🤖 בוט ג׳ולייט",
];
const DEMO_ANSWERS = [
  "ברור שזה קרה בדיוק כשהמפק״צ הסתכל",
  "אני עדיין טוען שזה היה חלק מהתכנון",
  "שתי דקות ואני מסדר את זה",
  "מי הביא את הפק״ל קפה?",
  "אין לי מושג, אבל אני מצביע בביטחון",
  "צוות 2 — אין דברים כאלה",
  "אמרו לי שיש פה ניקוד",
  "אני מבקש להתייעץ עם חבר טלפוני",
  "בדקתי פעמיים. בערך.",
  "זו התשובה הסופית שלי, כנראה",
];

export function registerSocketHandlers(io: Server) {
  io.on("connection", (socket: Socket) => {
    // ---------- Host ----------
    socket.on("host:createSession", async ({ eventId }: { eventId: string }, cb: Ack = noop) => {
      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (!event) return cb({ ok: false, error: "האירוע לא נמצא" });

      let joinCode = generateJoinCode();
      // Extremely unlikely collision loop, bounded for safety.
      for (let i = 0; i < 5; i++) {
        const existing = await getSessionByCode(joinCode);
        if (!existing) break;
        joinCode = generateJoinCode();
      }
      const hostToken = generateHostToken();
      const roundIds = (
        await prisma.round.findMany({ where: { eventId }, orderBy: { order: "asc" }, select: { id: true } })
      ).map((round) => round.id);
      for (let i = roundIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [roundIds[i], roundIds[j]] = [roundIds[j], roundIds[i]];
      }
      const session = await prisma.session.create({
        data: { eventId, joinCode, hostToken, roundOrderJson: JSON.stringify(roundIds) },
      });
      socket.join(roomName(session.id));
      socket.data.role = "host";
      socket.data.sessionId = session.id;
      const state = await buildPublicState(session.id);
      cb({ ok: true, code: session.joinCode, hostToken, state });
    });

    socket.on(
      "host:reclaimSession",
      async ({ code, hostToken }: { code: string; hostToken: string }, cb: Ack = noop) => {
        const session = await getSessionByCode(code);
        if (!session || session.hostToken !== hostToken) {
          return cb({ ok: false, error: "לא נמצא חדר" });
        }
        socket.join(roomName(session.id));
        socket.data.role = "host";
        socket.data.sessionId = session.id;
        const state = await buildPublicState(session.id);
        cb({ ok: true, state });
      }
    );

    async function requireHost(code: string, hostToken: string) {
      const session = await getSessionByCode(code);
      if (!session || session.hostToken !== hostToken) return null;
      return session;
    }

    socket.on(
      "host:removeParticipant",
      async (
        { code, hostToken, participantId }: { code: string; hostToken: string; participantId: string },
        cb: Ack = noop
      ) => {
        const session = await requireHost(code, hostToken);
        if (!session) return cb({ ok: false, error: "אין הרשאה" });
        await prisma.participant.update({ where: { id: participantId }, data: { removed: true } });
        cb({ ok: true });
        await broadcast(io, session.id);
      }
    );

    socket.on(
      "host:addDemoBots",
      async ({ code, hostToken }: { code: string; hostToken: string }, cb: Ack = noop) => {
        const session = await requireHost(code, hostToken);
        if (!session) return cb({ ok: false, error: "אין הרשאה" });
        if (session.status !== "LOBBY") return cb({ ok: false, error: "אפשר להוסיף בוטים רק לפני תחילת המשחק" });

        const existingBots = await prisma.participant.findMany({
          where: { sessionId: session.id, deviceToken: { startsWith: `demo-bot:${session.id}:` } },
        });
        const existingIndexes = new Set(
          existingBots
            .map((bot) => Number(bot.deviceToken.split(":").at(-1)))
            .filter((index) => Number.isInteger(index))
        );
        const missing = DEMO_BOT_NAMES
          .map((name, index) => ({ name, index }))
          .filter(({ index }) => !existingIndexes.has(index));

        if (missing.length) {
          await prisma.participant.createMany({
            data: missing.map(({ name, index }) => ({
              sessionId: session.id,
              name,
              deviceToken: `demo-bot:${session.id}:${index}`,
              connected: true,
            })),
          });
        }

        cb({ ok: true, added: missing.length });
        await broadcast(io, session.id);
      }
    );

    socket.on(
      "host:startGame",
      async ({ code, hostToken }: { code: string; hostToken: string }, cb: Ack = noop) => {
        const session = await requireHost(code, hostToken);
        if (!session) return cb({ ok: false, error: "אין הרשאה" });
        await withLock(session.id, async () => {
          if (session.status !== "LOBBY") return;
          const activeCount = await prisma.participant.count({
            where: { sessionId: session.id, removed: false },
          });
          if (activeCount < 1) throw new Error("צריך לפחות משתתף אחד כדי להתחיל");
          await prisma.session.update({
            where: { id: session.id },
            data: { status: "IN_ROUND", currentRoundIndex: 0, currentRoundPhase: "IDLE" },
          });
        }).then(
          () => cb({ ok: true }),
          (err: Error) => cb({ ok: false, error: err.message })
        );
        await broadcast(io, session.id);
      }
    );

    socket.on(
      "host:openVoting",
      async ({ code, hostToken }: { code: string; hostToken: string }, cb: Ack = noop) => {
        const session = await requireHost(code, hostToken);
        if (!session) return cb({ ok: false, error: "אין הרשאה" });
        await withLock(session.id, async () => {
          if (session.status !== "IN_ROUND") return;
          if (!["IDLE", "VOTING_CLOSED"].includes(session.currentRoundPhase)) return;
          await prisma.session.update({
            where: { id: session.id },
            data: { currentRoundPhase: "VOTING_OPEN", votingOpenedAt: new Date() },
          });
          const rounds = await getEventRounds(session.eventId, session.roundOrderJson);
          const round = rounds[session.currentRoundIndex];
          if (round) {
            const bots = await prisma.participant.findMany({
              where: {
                sessionId: session.id,
                removed: false,
                deviceToken: { startsWith: `demo-bot:${session.id}:` },
              },
              orderBy: { joinedAt: "asc" },
            });
            const participants = await prisma.participant.findMany({
              where: { sessionId: session.id, removed: false },
              orderBy: { joinedAt: "asc" },
            });

            bots.forEach((bot, index) => {
              setTimeout(async () => {
                const fresh = await prisma.session.findUnique({ where: { id: session.id } });
                if (fresh?.currentRoundPhase !== "VOTING_OPEN" || fresh.currentRoundIndex !== session.currentRoundIndex) {
                  return;
                }

                try {
                  if (round.type === "ANONYMOUS_PROMPT") {
                    await prisma.anonymousAnswer.create({
                      data: {
                        sessionId: session.id,
                        roundId: round.id,
                        participantId: bot.id,
                        text: DEMO_ANSWERS[index % DEMO_ANSWERS.length],
                      },
                    });
                  } else if (PARTICIPANT_TARGET_TYPES.includes(round.type as never)) {
                    const candidates = participants.filter((participant) => round.allowSelfVote || participant.id !== bot.id);
                    const target = candidates[(index * 3 + round.order) % candidates.length];
                    if (!target) return;
                    await prisma.vote.create({
                      data: {
                        sessionId: session.id,
                        roundId: round.id,
                        participantId: bot.id,
                        targetParticipantId: target.id,
                      },
                    });
                  } else if (OPTION_BASED_TYPES.includes(round.type as never)) {
                    const option = round.options[(index + round.order) % round.options.length];
                    if (!option) return;
                    await prisma.vote.create({
                      data: {
                        sessionId: session.id,
                        roundId: round.id,
                        participantId: bot.id,
                        optionId: option.id,
                      },
                    });
                  }
                } catch {
                  // Re-opening a vote can encounter an answer the bot already submitted.
                }
                await broadcast(io, session.id);
                await revealIfEveryoneAnswered(io, session.id, round.id);
              }, 500 + index * 180);
            });
          }
          if (round?.timeLimitSec) {
            scheduleAutoClose(session.id, round.timeLimitSec * 1000, () => {
              withLock(session.id, async () => {
                const fresh = await prisma.session.findUnique({ where: { id: session.id } });
                if (fresh?.currentRoundPhase !== "VOTING_OPEN") return;
                await revealCurrentRoundLocked(session.id);
              }).then(() => broadcast(io, session.id));
            });
          }
        });
        cb({ ok: true });
        await broadcast(io, session.id);
      }
    );

    socket.on(
      "host:closeVoting",
      async ({ code, hostToken }: { code: string; hostToken: string }, cb: Ack = noop) => {
        const session = await requireHost(code, hostToken);
        if (!session) return cb({ ok: false, error: "אין הרשאה" });
        clearAutoClose(session.id);
        await withLock(session.id, async () => {
          if (session.currentRoundPhase !== "VOTING_OPEN") return;
          await revealCurrentRoundLocked(session.id);
        });
        cb({ ok: true });
        await broadcast(io, session.id);
      }
    );

    socket.on(
      "host:reveal",
      async ({ code, hostToken }: { code: string; hostToken: string }, cb: Ack = noop) => {
        const session = await requireHost(code, hostToken);
        if (!session) return cb({ ok: false, error: "אין הרשאה" });
        await withLock(session.id, async () => {
          await revealCurrentRoundLocked(session.id);
        });
        cb({ ok: true });
        await broadcast(io, session.id);
      }
    );

    socket.on(
      "host:markHeadToHeadWinner",
      async (
        { code, hostToken, optionId }: { code: string; hostToken: string; optionId: string },
        cb: Ack = noop
      ) => {
        const session = await requireHost(code, hostToken);
        if (!session) return cb({ ok: false, error: "אין הרשאה" });
        await withLock(session.id, async () => {
          if (session.currentRoundPhase !== "REVEALED") return;
          const rounds = await getEventRounds(session.eventId, session.roundOrderJson);
          const round = rounds[session.currentRoundIndex];
          if (!round || round.type !== "HEAD_TO_HEAD") return;
          const stored = await prisma.roundResult.findUnique({
            where: { sessionId_roundId: { sessionId: session.id, roundId: round.id } },
          });
          if (!stored) return;
          const votes = await prisma.vote.findMany({ where: { sessionId: session.id, roundId: round.id } });
          const base = JSON.parse(stored.resultJson);
          const updated = applyHeadToHeadWinner(base, votes, optionId, round.scoringEnabled);
          await prisma.roundResult.update({
            where: { sessionId_roundId: { sessionId: session.id, roundId: round.id } },
            data: { resultJson: JSON.stringify(updated) },
          });
          await applyScoring(session.id, updated.scored);
        });
        cb({ ok: true });
        await broadcast(io, session.id);
      }
    );

    socket.on(
      "host:anonymousNext",
      async ({ code, hostToken }: { code: string; hostToken: string }, cb: Ack = noop) => {
        const session = await requireHost(code, hostToken);
        if (!session) return cb({ ok: false, error: "אין הרשאה" });
        await withLock(session.id, async () => {
          if (session.currentRoundPhase !== "REVEALED") return;
          const rounds = await getEventRounds(session.eventId, session.roundOrderJson);
          const round = rounds[session.currentRoundIndex];
          if (!round || round.type !== "ANONYMOUS_PROMPT") return;
          const stored = await prisma.roundResult.findUnique({
            where: { sessionId_roundId: { sessionId: session.id, roundId: round.id } },
          });
          if (!stored) return;
          const parsed = JSON.parse(stored.resultJson) as AnonymousPromptResult;
          const visible = parsed.answers.filter((a) => !a.hidden);
          parsed.shownIndex = Math.min(parsed.shownIndex + 1, Math.max(visible.length - 1, 0));
          await prisma.roundResult.update({
            where: { sessionId_roundId: { sessionId: session.id, roundId: round.id } },
            data: { resultJson: JSON.stringify(parsed) },
          });
        });
        cb({ ok: true });
        await broadcast(io, session.id);
      }
    );

    socket.on(
      "host:anonymousHide",
      async (
        {
          code,
          hostToken,
          answerId,
          hidden,
        }: { code: string; hostToken: string; answerId: string; hidden: boolean },
        cb: Ack = noop
      ) => {
        const session = await requireHost(code, hostToken);
        if (!session) return cb({ ok: false, error: "אין הרשאה" });
        await prisma.anonymousAnswer.update({ where: { id: answerId }, data: { hidden } });
        const rounds = await getEventRounds(session.eventId, session.roundOrderJson);
        const round = rounds[session.currentRoundIndex];
        if (round?.type === "ANONYMOUS_PROMPT") {
          const stored = await prisma.roundResult.findUnique({
            where: { sessionId_roundId: { sessionId: session.id, roundId: round.id } },
          });
          if (stored) {
            const parsed = JSON.parse(stored.resultJson) as AnonymousPromptResult;
            const entry = parsed.answers.find((a) => a.id === answerId);
            if (entry) entry.hidden = hidden;
            await prisma.roundResult.update({
              where: { sessionId_roundId: { sessionId: session.id, roundId: round.id } },
              data: { resultJson: JSON.stringify(parsed) },
            });
          }
        }
        cb({ ok: true });
        await broadcast(io, session.id);
      }
    );

    socket.on(
      "host:anonymousModerationView",
      async ({ code, hostToken }: { code: string; hostToken: string }, cb: Ack = noop) => {
        const session = await requireHost(code, hostToken);
        if (!session) return cb({ ok: false, error: "אין הרשאה" });
        const rounds = await getEventRounds(session.eventId, session.roundOrderJson);
        const round = rounds[session.currentRoundIndex];
        if (!round || round.type !== "ANONYMOUS_PROMPT") return cb({ ok: false, error: "לא רלוונטי" });
        const answers = await prisma.anonymousAnswer.findMany({
          where: { sessionId: session.id, roundId: round.id },
          include: { participant: true },
          orderBy: { createdAt: "asc" },
        });
        cb({
          ok: true,
          answers: answers.map((a) => ({
            id: a.id,
            text: a.text,
            hidden: a.hidden,
            authorName: a.participant.name,
          })),
        });
      }
    );

    socket.on(
      "host:skipRound",
      async ({ code, hostToken }: { code: string; hostToken: string }, cb: Ack = noop) => {
        const session = await requireHost(code, hostToken);
        if (!session) return cb({ ok: false, error: "אין הרשאה" });
        clearAutoClose(session.id);
        await withLock(session.id, async () => {
          if (session.currentRoundPhase === "DONE") return;
          await prisma.session.update({ where: { id: session.id }, data: { currentRoundPhase: "DONE" } });
        });
        cb({ ok: true });
        await broadcast(io, session.id);
      }
    );

    socket.on(
      "host:endRound",
      async ({ code, hostToken }: { code: string; hostToken: string }, cb: Ack = noop) => {
        const session = await requireHost(code, hostToken);
        if (!session) return cb({ ok: false, error: "אין הרשאה" });
        await withLock(session.id, async () => {
          if (session.currentRoundPhase !== "REVEALED") return;
          await prisma.session.update({ where: { id: session.id }, data: { currentRoundPhase: "DONE" } });
        });
        cb({ ok: true });
        await broadcast(io, session.id);
      }
    );

    socket.on(
      "host:nextRound",
      async ({ code, hostToken }: { code: string; hostToken: string }, cb: Ack = noop) => {
        const session = await requireHost(code, hostToken);
        if (!session) return cb({ ok: false, error: "אין הרשאה" });
        await withLock(session.id, async () => {
          if (session.status !== "IN_ROUND") return;
          if (session.currentRoundPhase !== "DONE") return;
          const rounds = await getEventRounds(session.eventId, session.roundOrderJson);
          const nextIndex = session.currentRoundIndex + 1;
          if (nextIndex >= rounds.length) return; // host must click "show final screen" instead
          await prisma.session.update({
            where: { id: session.id },
            data: { currentRoundIndex: nextIndex, currentRoundPhase: "IDLE" },
          });
        });
        cb({ ok: true });
        await broadcast(io, session.id);
      }
    );

    socket.on(
      "host:advanceRound",
      async ({ code, hostToken }: { code: string; hostToken: string }, cb: Ack = noop) => {
        const session = await requireHost(code, hostToken);
        if (!session) return cb({ ok: false, error: "אין הרשאה" });
        await withLock(session.id, async () => {
          const fresh = await prisma.session.findUnique({ where: { id: session.id } });
          if (!fresh || fresh.status !== "IN_ROUND" || fresh.currentRoundPhase !== "REVEALED") return;
          const rounds = await getEventRounds(fresh.eventId, fresh.roundOrderJson);
          const nextIndex = fresh.currentRoundIndex + 1;
          if (nextIndex >= rounds.length) {
            await prisma.session.update({
              where: { id: fresh.id },
              data: { status: "FINAL_AWARDS", currentRoundPhase: "DONE" },
            });
          } else {
            await prisma.session.update({
              where: { id: fresh.id },
              data: { currentRoundIndex: nextIndex, currentRoundPhase: "IDLE", votingOpenedAt: null },
            });
          }
        });
        cb({ ok: true });
        await broadcast(io, session.id);
      }
    );

    socket.on(
      "host:showFinalScreen",
      async ({ code, hostToken }: { code: string; hostToken: string }, cb: Ack = noop) => {
        const session = await requireHost(code, hostToken);
        if (!session) return cb({ ok: false, error: "אין הרשאה" });
        await withLock(session.id, async () => {
          if (session.currentRoundPhase !== "DONE" && session.status !== "IN_ROUND") return;
          await prisma.session.update({ where: { id: session.id }, data: { status: "FINAL_AWARDS" } });
        });
        cb({ ok: true });
        await broadcast(io, session.id);
      }
    );

    socket.on(
      "host:endSession",
      async ({ code, hostToken }: { code: string; hostToken: string }, cb: Ack = noop) => {
        const session = await requireHost(code, hostToken);
        if (!session) return cb({ ok: false, error: "אין הרשאה" });
        await prisma.session.update({ where: { id: session.id }, data: { status: "ENDED" } });
        cb({ ok: true });
        await broadcast(io, session.id);
      }
    );

    socket.on(
      "host:toggleLeaderboard",
      async ({ code, hostToken, show }: { code: string; hostToken: string; show: boolean }, cb: Ack = noop) => {
        const session = await requireHost(code, hostToken);
        if (!session) return cb({ ok: false, error: "אין הרשאה" });
        await prisma.session.update({ where: { id: session.id }, data: { showLeaderboard: show } });
        cb({ ok: true });
        await broadcast(io, session.id);
      }
    );

    socket.on(
      "host:adjustScore",
      async (
        { code, hostToken, participantId, delta }: { code: string; hostToken: string; participantId: string; delta: number },
        cb: Ack = noop
      ) => {
        const session = await requireHost(code, hostToken);
        if (!session) return cb({ ok: false, error: "אין הרשאה" });
        await prisma.participant.update({
          where: { id: participantId },
          data: { score: { increment: delta } },
        });
        cb({ ok: true });
        await broadcast(io, session.id);
      }
    );

    socket.on(
      "host:resetScores",
      async ({ code, hostToken }: { code: string; hostToken: string }, cb: Ack = noop) => {
        const session = await requireHost(code, hostToken);
        if (!session) return cb({ ok: false, error: "אין הרשאה" });
        await prisma.participant.updateMany({ where: { sessionId: session.id }, data: { score: 0 } });
        cb({ ok: true });
        await broadcast(io, session.id);
      }
    );

    // ---------- Participant ----------
    socket.on(
      "participant:join",
      async ({ code, name }: { code: string; name: string }, cb: Ack = noop) => {
        const session = await getSessionByCode(code);
        if (!session) return cb({ ok: false, error: "לא נמצא חדר עם הקוד הזה" });
        if (session.status !== "LOBBY") return cb({ ok: false, error: "המשחק כבר התחיל" });
        const trimmed = name.trim().slice(0, 24);
        if (!trimmed) return cb({ ok: false, error: "יש להזין שם" });
        const activeCount = await prisma.participant.count({
          where: { sessionId: session.id, removed: false },
        });
        if (activeCount >= MAX_PARTICIPANTS) return cb({ ok: false, error: "החדר מלא" });

        const deviceToken = generateDeviceToken();
        const participant = await prisma.participant.create({
          data: { sessionId: session.id, name: trimmed, deviceToken },
        });
        socket.join(roomName(session.id));
        socket.data.role = "participant";
        socket.data.sessionId = session.id;
        socket.data.participantId = participant.id;
        const state = await buildPublicState(session.id);
        cb({ ok: true, deviceToken, participantId: participant.id, name: trimmed, state });
        await broadcast(io, session.id);
      }
    );

    socket.on(
      "participant:rejoin",
      async ({ code, deviceToken }: { code: string; deviceToken: string }, cb: Ack = noop) => {
        const session = await getSessionByCode(code);
        if (!session) return cb({ ok: false, error: "החדר לא נמצא" });
        const participant = await prisma.participant.findUnique({ where: { deviceToken } });
        if (!participant || participant.sessionId !== session.id || participant.removed) {
          return cb({ ok: false, error: "לא ניתן להתחבר מחדש" });
        }
        await prisma.participant.update({ where: { id: participant.id }, data: { connected: true } });
        socket.join(roomName(session.id));
        socket.data.role = "participant";
        socket.data.sessionId = session.id;
        socket.data.participantId = participant.id;

        let hasSubmitted = false;
        const rounds = await getEventRounds(session.eventId, session.roundOrderJson);
        const round = rounds[session.currentRoundIndex];
        if (round) {
          if (round.type === "ANONYMOUS_PROMPT") {
            const existing = await prisma.anonymousAnswer.findUnique({
              where: { sessionId_roundId_participantId: { sessionId: session.id, roundId: round.id, participantId: participant.id } },
            });
            hasSubmitted = !!existing;
          } else {
            const existing = await prisma.vote.findUnique({
              where: { sessionId_roundId_participantId: { sessionId: session.id, roundId: round.id, participantId: participant.id } },
            });
            hasSubmitted = !!existing;
          }
        }

        const state = await buildPublicState(session.id);
        cb({ ok: true, participantId: participant.id, name: participant.name, state, hasSubmitted });
        await broadcast(io, session.id);
      }
    );

    socket.on(
      "participant:vote",
      async (
        {
          code,
          targetParticipantId,
          optionId,
        }: { code: string; targetParticipantId?: string; optionId?: string },
        cb: Ack = noop
      ) => {
        const session = await getSessionByCode(code);
        const participantId = socket.data.participantId as string | undefined;
        if (!session || !participantId) return cb({ ok: false, error: "אין הרשאה" });
        const voter = await prisma.participant.findUnique({ where: { id: participantId } });
        if (!voter || voter.removed || voter.sessionId !== session.id) {
          return cb({ ok: false, error: "אין הרשאה" });
        }
        if (session.currentRoundPhase !== "VOTING_OPEN") {
          return cb({ ok: false, error: "ההצבעה סגורה" });
        }
        const rounds = await getEventRounds(session.eventId, session.roundOrderJson);
        const round = rounds[session.currentRoundIndex];
        if (!round) return cb({ ok: false, error: "אין שאלה פעילה" });

        try {
          if (PARTICIPANT_TARGET_TYPES.includes(round.type as never)) {
            if (!targetParticipantId) return cb({ ok: false, error: "יש לבחור משתתף" });
            if (!round.allowSelfVote && targetParticipantId === participantId) {
              return cb({ ok: false, error: "אי אפשר להצביע לעצמך בשאלה הזו" });
            }
            await prisma.vote.create({
              data: { sessionId: session.id, roundId: round.id, participantId, targetParticipantId },
            });
          } else if (OPTION_BASED_TYPES.includes(round.type as never)) {
            if (!optionId) return cb({ ok: false, error: "יש לבחור תשובה" });
            await prisma.vote.create({
              data: { sessionId: session.id, roundId: round.id, participantId, optionId },
            });
          } else {
            return cb({ ok: false, error: "סוג שאלה לא נתמך להצבעה" });
          }
        } catch {
          // Unique constraint violation -> already voted this round. Treat as
          // idempotent success rather than an error (double-tap safe).
          return cb({ ok: true, alreadyVoted: true });
        }
        cb({ ok: true });
        await broadcast(io, session.id);
        await revealIfEveryoneAnswered(io, session.id, round.id);
      }
    );

    socket.on(
      "participant:submitAnswer",
      async ({ code, text }: { code: string; text: string }, cb: Ack = noop) => {
        const session = await getSessionByCode(code);
        const participantId = socket.data.participantId as string | undefined;
        if (!session || !participantId) return cb({ ok: false, error: "אין הרשאה" });
        const voter = await prisma.participant.findUnique({ where: { id: participantId } });
        if (!voter || voter.removed || voter.sessionId !== session.id) {
          return cb({ ok: false, error: "אין הרשאה" });
        }
        if (session.currentRoundPhase !== "VOTING_OPEN") {
          return cb({ ok: false, error: "לא ניתן לענות כרגע" });
        }
        const trimmed = text.trim().slice(0, 300);
        if (!trimmed) return cb({ ok: false, error: "יש לכתוב תשובה" });
        const rounds = await getEventRounds(session.eventId, session.roundOrderJson);
        const round = rounds[session.currentRoundIndex];
        if (!round || round.type !== "ANONYMOUS_PROMPT") return cb({ ok: false, error: "לא רלוונטי" });

        try {
          await prisma.anonymousAnswer.create({
            data: { sessionId: session.id, roundId: round.id, participantId, text: trimmed },
          });
        } catch {
          return cb({ ok: true, alreadyAnswered: true });
        }
        cb({ ok: true });
        await broadcast(io, session.id);
        await revealIfEveryoneAnswered(io, session.id, round.id);
      }
    );

    // ---------- Presentation (read-only) ----------
    socket.on("present:subscribe", async ({ code }: { code: string }, cb: Ack = noop) => {
      const session = await getSessionByCode(code);
      if (!session) return cb({ ok: false, error: "החדר לא נמצא" });
      socket.join(roomName(session.id));
      socket.data.role = "presentation";
      socket.data.sessionId = session.id;
      const state = await buildPublicState(session.id);
      cb({ ok: true, state });
    });

    // ---------- Disconnect ----------
    socket.on("disconnect", async () => {
      const { role, sessionId, participantId } = socket.data as {
        role?: string;
        sessionId?: string;
        participantId?: string;
      };
      if (!sessionId) return;
      if (role === "participant" && participantId) {
        const remainingSockets = await io.in(roomName(sessionId)).fetchSockets();
        const stillConnected = remainingSockets.some(
          (s) => s.data.participantId === participantId && s.id !== socket.id
        );
        if (!stillConnected) {
          await prisma.participant.update({ where: { id: participantId }, data: { connected: false } }).catch(() => {});
        }
      }
      await broadcast(io, sessionId);
    });
  });
}
