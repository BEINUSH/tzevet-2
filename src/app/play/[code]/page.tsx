"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSocket, emitAsync } from "@/lib/socketClient";
import { loadParticipantSession, saveParticipantSession, clearParticipantSession } from "@/lib/storage";
import { useSound } from "@/lib/useSound";
import { Card } from "@/components/ui/Card";
import { CountdownBar } from "@/components/ui/CountdownBar";
import { MostLikelyVote } from "@/components/rounds/MostLikelyVote";
import { ChoiceVote } from "@/components/rounds/ChoiceVote";
import { HeadToHeadVote } from "@/components/rounds/HeadToHeadVote";
import { AnonymousPromptSubmit } from "@/components/rounds/AnonymousPromptSubmit";
import { TallyList } from "@/components/TallyList";
import { Leaderboard } from "@/components/Leaderboard";
import type {
  ChoiceResult,
  HeadToHeadResult,
  MostLikelyResult,
  PublicSessionState,
} from "@/types/game";

export default function PlayPage() {
  const params = useParams<{ code: string }>();
  const code = (params.code || "").toUpperCase();
  const router = useRouter();
  const sound = useSound();

  const [state, setState] = useState<PublicSessionState | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [voteFeedback, setVoteFeedback] = useState<string | null>(null);

  useEffect(() => {
    const loaded = loadParticipantSession();
    if (!loaded || loaded.code !== code) {
      router.replace(`/join?code=${code}`);
      return;
    }
    const session = loaded;
    setName(session.name);
    const socket = getSocket();

    async function rejoin() {
      const res = await emitAsync<{
        ok: boolean;
        error?: string;
        participantId?: string;
        name?: string;
        state?: PublicSessionState;
        hasSubmitted?: boolean;
      }>("participant:rejoin", { code, deviceToken: session.deviceToken });
      if (res.ok && res.state && res.participantId) {
        setParticipantId(res.participantId);
        setState(res.state);
        setHasSubmitted(!!res.hasSubmitted);
        if (res.name) {
          setName(res.name);
          saveParticipantSession({ ...session, name: res.name });
        }
      } else {
        setError(res.error || "לא ניתן להתחבר. הצטרפו מחדש.");
        clearParticipantSession();
        setTimeout(() => router.replace(`/join?code=${code}`), 1800);
      }
    }

    rejoin();
    socket.on("connect", rejoin);
    const onState = (s: PublicSessionState) => {
      setState((prev) => {
        const roundChanged = prev && prev.round?.id !== s.round?.id;
        if (roundChanged) {
          setHasSubmitted(false);
          setVoteFeedback(null);
        }
        if (prev && prev.roundPhase !== "REVEALED" && s.roundPhase === "REVEALED") {
          sound.play("reveal");
        }
        return s;
      });
    };
    socket.on("state", onState);
    return () => {
      socket.off("connect", rejoin);
      socket.off("state", onState);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  if (error) {
    return (
      <main className="flex-1 flex items-center justify-center px-6 text-center">
        <p className="text-brand-danger font-semibold">{error}</p>
      </main>
    );
  }

  if (!state || !participantId) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-brand-muted animate-pulse">מתחברים...</p>
      </main>
    );
  }

  if (!state.participants.some((p) => p.id === participantId)) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
        <div className="text-4xl">🚪</div>
        <p className="text-brand-danger font-semibold">המנחה הסיר אותך מהחדר</p>
        <p className="text-brand-muted text-sm">אם זו טעות, הצטרפו מחדש עם הקוד</p>
      </main>
    );
  }

  async function handleVote(payload: { targetParticipantId?: string; optionId?: string }, label: string) {
    setHasSubmitted(true);
    setVoteFeedback(label);
    const res = await emitAsync<{ ok: boolean }>("participant:vote", { code, ...payload });
    if (!res.ok) {
      setHasSubmitted(false);
      setVoteFeedback(null);
    }
  }

  async function handleSubmitAnswer(text: string) {
    setHasSubmitted(true);
    const res = await emitAsync<{ ok: boolean }>("participant:submitAnswer", { code, text });
    if (!res.ok) setHasSubmitted(false);
  }

  const round = state.round;

  return (
    <main className="flex-1 flex flex-col px-4 py-6 max-w-md mx-auto w-full">
      <header className="flex items-center justify-between mb-4">
        <span className="text-brand-muted text-sm">שלום, {name} 👋</span>
        <span className="text-brand-gold font-bold text-sm">{state.eventName}</span>
      </header>

      {state.status === "LOBBY" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
          <div className="text-5xl animate-pulse">⏳</div>
          <h2 className="text-xl font-bold">ממתינים שהמנחה יתחיל את הערב...</h2>
          <p className="text-brand-muted">{state.participants.length} משתתפים כבר בפנים</p>
        </div>
      )}

      {state.status === "IN_ROUND" && round && (
        <div className="flex-1 flex flex-col gap-4">
          <Card>
            <p className="text-brand-muted text-xs mb-1">
              שאלה {state.roundIndex + 1} מתוך {state.totalRounds}
            </p>
            <h2 className="text-xl font-bold">{round.questionText}</h2>
          </Card>

          {round.timeLimitSec && state.roundPhase === "VOTING_OPEN" && (
            <CountdownBar
              votingOpenedAt={state.votingOpenedAt}
              timeLimitSec={round.timeLimitSec}
              onTick={(s) => s <= 3 && s > 0 && sound.play("tick")}
            />
          )}

          {(state.roundPhase === "IDLE" || state.roundPhase === "VOTING_CLOSED") && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
              <div className="text-4xl">🎙️</div>
              <p className="text-brand-muted">
                {state.roundPhase === "IDLE" ? "המנחה מכין את השאלה הבאה..." : "ההצבעה נסגרה, מחכים לחשיפה..."}
              </p>
            </div>
          )}

          {state.roundPhase === "VOTING_OPEN" && !hasSubmitted && (
            <div className="flex-1">
              {round.type === "MOST_LIKELY" || round.type === "AWARDS" ? (
                <MostLikelyVote
                  participants={state.participants}
                  selfId={participantId}
                  allowSelfVote={round.allowSelfVote}
                  onVote={(targetId) => {
                    const targetName = state.participants.find((p) => p.id === targetId)?.name ?? "";
                    handleVote({ targetParticipantId: targetId }, targetName);
                  }}
                />
              ) : round.type === "HEAD_TO_HEAD" ? (
                <HeadToHeadVote
                  options={round.options}
                  onVote={(optionId) => {
                    const label = round.options.find((o) => o.id === optionId)?.text ?? "";
                    handleVote({ optionId }, label);
                  }}
                />
              ) : round.type === "ANONYMOUS_PROMPT" ? (
                <AnonymousPromptSubmit onSubmit={handleSubmitAnswer} />
              ) : (
                <ChoiceVote
                  options={round.options}
                  onVote={(optionId) => {
                    const label = round.options.find((o) => o.id === optionId)?.text ?? "";
                    handleVote({ optionId }, label);
                  }}
                />
              )}
            </div>
          )}

          {state.roundPhase === "VOTING_OPEN" && hasSubmitted && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
              <div className="text-4xl animate-pulse">✓</div>
              <h3 className="text-lg font-bold">
                {round.type === "ANONYMOUS_PROMPT" ? "התשובה נשלחה!" : "ההצבעה נקלטה!"}
              </h3>
              {voteFeedback && round.type !== "ANONYMOUS_PROMPT" && (
                <p className="text-brand-muted">בחרת: {voteFeedback}</p>
              )}
              <p className="text-brand-muted text-sm">
                {state.votesCast} / {state.votesNeeded} ענו... ממתינים לשאר הצוות
              </p>
            </div>
          )}

          {(state.roundPhase === "REVEALED" || state.roundPhase === "DONE") && state.result && (
            <RoundResultView result={state.result} />
          )}
        </div>
      )}

      {state.showLeaderboard && (
        <Card className="mt-4">
          <h3 className="font-bold mb-3 text-center gold-text">טבלת המובילים</h3>
          <Leaderboard participants={state.participants} limit={5} />
        </Card>
      )}

      {state.status === "FINAL_AWARDS" || state.status === "ENDED" ? (
        <div className="flex-1 flex flex-col gap-4 items-center text-center py-6">
          <h2 className="text-2xl font-black gold-text">🏆 סיכום הערב 🏆</h2>
          {state.finalLeaderboard && <Leaderboard participants={state.finalLeaderboard} />}
          {state.allAwards && state.allAwards.length > 0 && (
            <div className="w-full flex flex-col gap-2 mt-4">
              {state.allAwards.map((a) => (
                <Card key={a.roundTitle} className="text-right">
                  <p className="text-brand-muted text-xs">{a.roundTitle}</p>
                  <p className="font-bold text-brand-gold">{a.winners.join(", ") || "—"}</p>
                </Card>
              ))}
            </div>
          )}
          <p className="text-brand-muted mt-4">תודה שהייתם חלק מהערב! 🎉</p>
        </div>
      ) : null}
    </main>
  );
}

function RoundResultView({ result }: { result: PublicSessionState["result"] }) {
  if (!result) return null;
  if (result.kind === "MOST_LIKELY" || result.kind === "AWARDS") {
    const r = result as MostLikelyResult;
    return (
      <Card>
        <TallyList tally={r.tally} winnerKeys={r.winnerKeys} size="sm" />
      </Card>
    );
  }
  if (result.kind === "WHO_SAID_IT" || result.kind === "TRIVIA") {
    const r = result as ChoiceResult;
    return (
      <Card>
        <TallyList tally={r.tally} correctKey={r.correctOptionId ?? undefined} size="sm" />
      </Card>
    );
  }
  if (result.kind === "HEAD_TO_HEAD") {
    const r = result as HeadToHeadResult;
    return (
      <Card>
        <TallyList
          tally={r.contestants.map((c) => ({ key: c.optionId, label: c.name, votes: c.votes }))}
          winnerKeys={r.winnerOptionId ? [r.winnerOptionId] : []}
          size="sm"
        />
        {!r.winnerOptionId && <p className="text-brand-muted text-sm text-center mt-2">מחכים לתוצאה מהמנחה...</p>}
      </Card>
    );
  }
  if (result.kind === "ANONYMOUS_PROMPT") {
    const visible = result.answers.filter((a) => !a.hidden);
    const current = visible[result.shownIndex];
    return (
      <Card className="text-center">
        <p className="text-brand-muted text-xs mb-2">תשובה אנונימית</p>
        <p className="text-lg font-semibold">{current ? `"${current.text}"` : "..."}</p>
      </Card>
    );
  }
  return null;
}
