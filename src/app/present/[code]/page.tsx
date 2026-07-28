"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { getSocket, emitAsync } from "@/lib/socketClient";
import { useSound } from "@/lib/useSound";
import { QRCodeImage } from "@/components/QRCodeImage";
import { TallyList } from "@/components/TallyList";
import { Podium } from "@/components/Podium";
import { CountdownBar } from "@/components/ui/CountdownBar";
import { MAX_PARTICIPANTS, ROUND_TYPE_LABELS } from "@/types/game";
import type {
  ChoiceResult,
  HeadToHeadResult,
  MostLikelyResult,
  AnonymousPromptResult,
  PublicSessionState,
} from "@/types/game";

export default function PresentPage() {
  const params = useParams<{ code: string }>();
  const code = (params.code || "").toUpperCase();
  const sound = useSound();

  const [state, setState] = useState<PublicSessionState | null>(null);
  const [error, setError] = useState("");
  const [joinUrl, setJoinUrl] = useState("");

  useEffect(() => {
    setJoinUrl(`${window.location.origin}/join?code=${code}`);
    const socket = getSocket();

    async function subscribe() {
      const res = await emitAsync<{ ok: boolean; error?: string; state?: PublicSessionState }>(
        "present:subscribe",
        { code }
      );
      if (res.ok && res.state) setState(res.state);
      else setError(res.error || "החדר לא נמצא");
    }

    subscribe();
    socket.on("connect", subscribe);
    const onState = (s: PublicSessionState) => {
      setState((prev) => {
        if (prev && prev.roundPhase !== "REVEALED" && s.roundPhase === "REVEALED") sound.play("reveal");
        if (prev && prev.round?.id !== s.round?.id) sound.play("next");
        return s;
      });
    };
    socket.on("state", onState);
    return () => {
      socket.off("connect", subscribe);
      socket.off("state", onState);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  if (error) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-brand-danger text-2xl font-bold">{error}</p>
      </main>
    );
  }
  if (!state) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-brand-muted text-2xl animate-pulse">טוען...</p>
      </main>
    );
  }

  const checkpointRound =
    state.status === "IN_ROUND" &&
    state.roundPhase === "REVEALED" &&
    (state.roundIndex + 1) % 7 === 0 &&
    state.roundIndex + 1 < state.totalRounds;
  const checkpointLeaders = [...state.participants].sort((a, b) => b.score - a.score).slice(0, 2);

  return (
    <main className="flex-1 flex flex-col relative overflow-hidden px-10 py-8">
      <button
        onClick={sound.toggle}
        className="absolute top-6 left-6 text-2xl opacity-50 hover:opacity-100 z-10"
        aria-label="השתקת צלילים"
      >
        {sound.enabled ? "🔊" : "🔇"}
      </button>

      <AnimatePresence mode="wait">
        {checkpointRound ? (
          <motion.div key={`checkpoint-${state.roundIndex}`} {...fade} className="flex-1 flex flex-col items-center justify-center gap-8 text-center">
            <p className="text-3xl text-brand-muted">סיכום ביניים · אחרי {state.roundIndex + 1} שאלות</p>
            <h1 className="text-6xl font-black gold-text">🏅 מי מוביל כרגע?</h1>
            <div className="flex flex-col md:flex-row gap-6 w-full max-w-4xl justify-center">
              {checkpointLeaders.map((participant, index) => (
                <motion.div
                  key={participant.id}
                  initial={{ opacity: 0, scale: 0.6, y: 30 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.7, type: "spring" }}
                  className={`card-glass rounded-3xl px-12 py-9 flex-1 ${
                    index === 0 ? "border-brand-gold bg-brand-gold/15" : ""
                  }`}
                >
                  <p className="text-3xl text-brand-muted">{index === 0 ? "🥇 מקום ראשון" : "🥈 מקום שני"}</p>
                  <p className="mt-3 text-5xl md:text-6xl font-black">{participant.name}</p>
                </motion.div>
              ))}
            </div>
            <p className="text-2xl text-brand-muted">הכול עדיין פתוח — ממשיכים!</p>
          </motion.div>
        ) : state.status === "LOBBY" ? (
          <motion.div key="lobby" {...fade} className="flex-1 flex flex-col items-center justify-center gap-8 text-center">
            <div>
              <h1 className="text-5xl md:text-6xl font-black gold-text">סיירת יואב - צוות בן ססי</h1>
              <p className="text-2xl text-brand-muted mt-3">סרקו והצטרפו</p>
            </div>
            <QRCodeImage value={joinUrl} size={280} />
            <p className="text-3xl font-bold">
              {state.participants.length} מתוך {MAX_PARTICIPANTS} כבר בפנים
            </p>
            <div className="flex flex-wrap gap-3 justify-center max-w-4xl">
              <AnimatePresence>
                {[...state.participants.slice(0, 40).map((p) => ({ id: p.id, name: p.name })), ...(state.participants.length > 40 ? [{ id: "__more__", name: `+${state.participants.length - 40} עוד` }] : [])].map((p) => (
                  <motion.span
                    key={p.id}
                    initial={{ opacity: 0, scale: 0.5, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="animate-pop-in rounded-full bg-brand-navy-lighter border border-brand-gold/30 px-5 py-2 text-xl font-semibold"
                  >
                    {p.name}
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        ) : state.status === "IN_ROUND" && state.round ? (
          <motion.div key={state.round.id + state.roundPhase} {...fade} className="flex-1 flex flex-col gap-6">
            <div className="text-center">
              <p className="text-xl text-brand-muted">
                {ROUND_TYPE_LABELS[state.round.type]} · שאלה {state.roundIndex + 1} מתוך {state.totalRounds}
              </p>
              <h1 className="text-4xl md:text-5xl font-black mt-2">{state.round.questionText}</h1>
              {state.round.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={state.round.imageUrl}
                  alt="תמונה לשאלה"
                  className="mx-auto mt-5 max-h-[48vh] max-w-3xl rounded-2xl object-contain shadow-2xl"
                />
              )}
            </div>

            {state.round.timeLimitSec && state.roundPhase === "VOTING_OPEN" && (
              <div className="max-w-xl mx-auto w-full">
                <CountdownBar votingOpenedAt={state.votingOpenedAt} timeLimitSec={state.round.timeLimitSec} />
              </div>
            )}

            <div className="flex-1 flex items-center justify-center">
              {state.roundPhase === "IDLE" && (
                <p className="text-2xl text-brand-muted animate-pulse">המנחה מכין את השאלה הבאה...</p>
              )}
              {state.roundPhase === "VOTING_OPEN" && (
                <div className="text-center">
                  <p className="text-7xl font-black gold-text">
                    {state.votesCast}/{state.votesNeeded}
                  </p>
                  <p className="text-2xl text-brand-muted mt-2">הצביעו עד כה</p>
                </div>
              )}
              {state.roundPhase === "VOTING_CLOSED" && (
                <p className="text-2xl text-brand-muted animate-pulse">ההצבעה נסגרה... מכינים תוצאות 🥁</p>
              )}
              {(state.roundPhase === "REVEALED" || state.roundPhase === "DONE") && state.result && (
                <PresentResult result={state.result} />
              )}
            </div>
          </motion.div>
        ) : state.status === "FINAL_AWARDS" || state.status === "ENDED" ? (
          <motion.div key="final" {...fade} className="flex-1 flex flex-col items-center justify-center gap-8 text-center">
            <h1 className="text-6xl font-black gold-text">🏆 סיכום הערב 🏆</h1>
            {state.finalLeaderboard && (
              <FinalPodium participants={state.finalLeaderboard} />
            )}
            {state.allAwards && state.allAwards.length > 0 && (
              <div className="grid grid-cols-2 gap-4 max-w-4xl w-full">
                {state.allAwards.map((a) => (
                  <div key={a.roundTitle} className="card-glass rounded-2xl px-5 py-4">
                    <p className="text-brand-muted text-sm">{a.roundTitle}</p>
                    <p className="text-xl font-bold text-brand-gold">{a.winners.join(", ") || "—"}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}

function FinalPodium({ participants }: { participants: PublicSessionState["participants"] }) {
  const topThree = [...participants].sort((a, b) => b.score - a.score).slice(0, 3).reverse();
  const places = ["מקום שלישי", "מקום שני", "מקום ראשון"];
  const medals = ["🥉", "🥈", "🥇"];

  return (
    <div className="flex flex-col gap-5 w-full max-w-3xl">
      {topThree.map((participant, index) => (
        <motion.div
          key={participant.id}
          initial={{ opacity: 0, scale: 0.7, y: 35 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: index * 1.5 + 0.5, type: "spring", stiffness: 110 }}
          className={`rounded-3xl border px-8 py-5 ${
            index === 2
              ? "border-brand-gold bg-brand-gold/20 text-5xl"
              : "border-brand-gold/30 bg-brand-navy-lighter text-4xl"
          }`}
        >
          <p className="text-xl text-brand-muted">{medals[index]} {places[index]}</p>
          <p className="mt-2 font-black">{participant.name}</p>
          <p className="mt-2 text-xl font-bold text-brand-gold">{participant.score} נקודות</p>
        </motion.div>
      ))}
    </div>
  );
}

const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.35 },
};

function PresentResult({ result }: { result: NonNullable<PublicSessionState["result"]> }) {
  if (result.kind === "MOST_LIKELY" || result.kind === "AWARDS") {
    const r = result as MostLikelyResult;
    if (r.tally.filter((t) => t.votes > 0).length >= 2) {
      return <Podium top={r.tally.slice(0, 3)} />;
    }
    return (
      <div className="w-full max-w-2xl">
        <TallyList tally={r.tally} winnerKeys={r.winnerKeys} size="lg" />
      </div>
    );
  }
  if (result.kind === "WHO_SAID_IT" || result.kind === "TRIVIA") {
    const r = result as ChoiceResult;
    return (
      <div className="w-full max-w-2xl">
        <TallyList tally={r.tally} correctKeys={r.correctOptionIds} size="lg" />
      </div>
    );
  }
  if (result.kind === "HEAD_TO_HEAD") {
    const r = result as HeadToHeadResult;
    return (
      <div className="w-full max-w-2xl flex flex-col gap-4">
        <TallyList
          tally={r.contestants.map((c) => ({ key: c.optionId, label: c.name, votes: c.votes }))}
          winnerKeys={r.winnerOptionId ? [r.winnerOptionId] : []}
          size="lg"
        />
        {r.winnerOptionId && (
          <motion.p
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center text-3xl font-black gold-text"
          >
            🏆 {r.contestants.find((c) => c.optionId === r.winnerOptionId)?.name} ניצח/ה!
          </motion.p>
        )}
      </div>
    );
  }
  if (result.kind === "ANONYMOUS_PROMPT") {
    const r = result as AnonymousPromptResult;
    const visible = r.answers.filter((a) => !a.hidden);
    const current = visible[r.shownIndex];
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={current?.id ?? "none"}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="card-glass rounded-3xl px-12 py-10 max-w-3xl text-center"
        >
          <p className="text-4xl font-bold leading-relaxed">{current ? `"${current.text}"` : "..."}</p>
        </motion.div>
      </AnimatePresence>
    );
  }
  return null;
}
