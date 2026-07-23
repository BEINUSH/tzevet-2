"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getSocket, emitAsync } from "@/lib/socketClient";
import { loadHostSession } from "@/lib/storage";
import { useSound } from "@/lib/useSound";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { QRCodeImage } from "@/components/QRCodeImage";
import { TallyList } from "@/components/TallyList";
import { Leaderboard } from "@/components/Leaderboard";
import { ROUND_TYPE_LABELS } from "@/types/game";
import type {
  ChoiceResult,
  HeadToHeadResult,
  MostLikelyResult,
  AnonymousPromptResult,
  PublicSessionState,
} from "@/types/game";

interface ModAnswer {
  id: string;
  text: string;
  hidden: boolean;
  authorName: string;
}

export default function HostControlPage() {
  const params = useParams<{ code: string }>();
  const code = (params.code || "").toUpperCase();
  const sound = useSound();

  const [hostToken, setHostToken] = useState<string | null>(null);
  const [state, setState] = useState<PublicSessionState | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [modAnswers, setModAnswers] = useState<ModAnswer[] | null>(null);
  const [joinUrl, setJoinUrl] = useState("");

  useEffect(() => {
    setJoinUrl(`${window.location.origin}/join?code=${code}`);
    const loaded = loadHostSession();
    if (!loaded || loaded.code !== code) {
      setError("אין הרשאה לחדר הזה. חזרו לרשימת האירועים ופתחו חדר חדש.");
      return;
    }
    const session = loaded;
    setHostToken(session.hostToken);
    const socket = getSocket();

    async function reclaim() {
      const res = await emitAsync<{ ok: boolean; error?: string; state?: PublicSessionState }>(
        "host:reclaimSession",
        { code, hostToken: session.hostToken }
      );
      if (res.ok && res.state) setState(res.state);
      else setError(res.error || "לא ניתן להתחבר לחדר");
    }

    reclaim();
    socket.on("connect", reclaim);
    const onState = (s: PublicSessionState) => {
      setState((prev) => {
        if (prev && prev.roundPhase !== "REVEALED" && s.roundPhase === "REVEALED") sound.play("reveal");
        return s;
      });
    };
    socket.on("state", onState);
    return () => {
      socket.off("connect", reclaim);
      socket.off("state", onState);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  async function call<T extends { ok: boolean; error?: string }>(event: string, payload: Record<string, unknown> = {}) {
    if (!hostToken) return;
    setBusy(true);
    const res = await emitAsync<T>(event, { code, hostToken, ...payload });
    setBusy(false);
    if (!res.ok && res.error) setError(res.error);
    else setError("");
    return res;
  }

  async function openModeration() {
    const res = await call<{ ok: boolean; answers?: ModAnswer[] }>("host:anonymousModerationView");
    if (res?.ok && res.answers) setModAnswers(res.answers);
  }

  if (error && !state) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
        <p className="text-brand-danger font-semibold">{error}</p>
        <Link href="/host" className="text-brand-gold underline">
          חזרה לרשימת האירועים
        </Link>
      </main>
    );
  }

  if (!state) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-brand-muted animate-pulse">מתחברים לחדר...</p>
      </main>
    );
  }

  const round = state.round;
  const isLastRound = state.roundIndex + 1 >= state.totalRounds;

  return (
    <main className="flex-1 flex flex-col gap-5 px-4 py-6 max-w-2xl mx-auto w-full">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black gold-text">{state.eventName}</h1>
          <p className="text-brand-muted text-sm">קוד חדר: {state.code}</p>
        </div>
        <a href={`/present/${state.code}`} target="_blank" rel="noreferrer">
          <Button size="sm" variant="secondary">
            🖥️ מסך הקרנה
          </Button>
        </a>
      </header>

      {error && <p className="text-brand-danger font-semibold">{error}</p>}

      {state.status === "LOBBY" && (
        <Card className="flex flex-col items-center gap-4 text-center">
          <QRCodeImage value={joinUrl} size={200} />
          <p className="text-brand-muted text-sm break-all">{joinUrl}</p>
          <p className="font-bold text-lg">{state.participants.length} משתתפים בפנים</p>
          <div className="flex flex-wrap gap-2 justify-center max-w-lg">
            {state.participants.map((p) => (
              <span
                key={p.id}
                className="flex items-center gap-2 rounded-full bg-brand-navy-lighter px-3 py-1.5 text-sm"
              >
                {p.name}
                <button
                  onClick={() => call("host:removeParticipant", { participantId: p.id })}
                  className="text-brand-danger font-bold"
                  aria-label={`הסר את ${p.name}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <Button size="lg" disabled={state.participants.length < 2 || busy} onClick={() => call("host:startGame")}>
            🚀 התחלת המשחק
          </Button>
        </Card>
      )}

      {state.status === "IN_ROUND" && round && (
        <Card className="flex flex-col gap-4">
          <div>
            <p className="text-brand-muted text-xs">
              {ROUND_TYPE_LABELS[round.type]} · שאלה {state.roundIndex + 1}/{state.totalRounds}
            </p>
            <h2 className="text-xl font-bold">{round.questionText}</h2>
          </div>

          {(state.roundPhase === "IDLE" || state.roundPhase === "VOTING_CLOSED") && (
            <div className="flex gap-2 flex-wrap">
              <Button disabled={busy} onClick={() => call("host:openVoting")}>
                {state.roundPhase === "IDLE" ? "▶️ פתח הצבעה" : "🔓 פתח הצבעה שוב"}
              </Button>
              {state.roundPhase === "VOTING_CLOSED" && (
                <Button disabled={busy} onClick={() => call("host:reveal")}>
                  🎬 חשוף תוצאות
                </Button>
              )}
              <Button variant="secondary" disabled={busy} onClick={() => call("host:skipRound")}>
                ⏭ דלג על שאלה
              </Button>
            </div>
          )}

          {state.roundPhase === "VOTING_OPEN" && (
            <div className="flex flex-col gap-3">
              <p className="font-bold text-brand-gold">
                {state.votesCast} / {state.votesNeeded} ענו
              </p>
              <div className="h-3 w-full rounded-full bg-brand-navy-lighter overflow-hidden">
                <div
                  className="h-full bg-gradient-to-l from-brand-gold to-brand-gold-light transition-all"
                  style={{ width: `${state.votesNeeded ? (state.votesCast / state.votesNeeded) * 100 : 0}%` }}
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button disabled={busy} onClick={() => call("host:closeVoting")}>
                  🔒 סגור הצבעה
                </Button>
                <Button variant="secondary" disabled={busy} onClick={() => call("host:skipRound")}>
                  ⏭ דלג
                </Button>
              </div>
            </div>
          )}

          {(state.roundPhase === "REVEALED" || state.roundPhase === "DONE") && state.result && (
            <HostResultPanel
              result={state.result}
              onMarkWinner={(optionId) => call("host:markHeadToHeadWinner", { optionId })}
              onAnonymousNext={() => call("host:anonymousNext")}
              onAnonymousHide={(answerId, hidden) => call("host:anonymousHide", { answerId, hidden })}
              modAnswers={modAnswers}
              onOpenModeration={openModeration}
              busy={busy}
            />
          )}

          {state.roundPhase === "REVEALED" && (
            <Button disabled={busy} onClick={() => call("host:endRound")}>
              ✅ סיום סבב
            </Button>
          )}

          {state.roundPhase === "DONE" &&
            (isLastRound ? (
              <Button disabled={busy} onClick={() => call("host:showFinalScreen")}>
                🏁 הצגת מסך סיום
              </Button>
            ) : (
              <Button disabled={busy} onClick={() => call("host:nextRound")}>
                ⏭ מעבר לשאלה הבאה
              </Button>
            ))}
        </Card>
      )}

      {(state.status === "FINAL_AWARDS" || state.status === "ENDED") && (
        <Card className="flex flex-col gap-4">
          <h2 className="text-xl font-bold gold-text text-center">🏆 מסך סיום</h2>
          {state.finalLeaderboard && <Leaderboard participants={state.finalLeaderboard} />}
          {state.status !== "ENDED" && (
            <Button variant="danger" disabled={busy} onClick={() => call("host:endSession")}>
              סיום מוחלט של הערב
            </Button>
          )}
        </Card>
      )}

      {state.status === "IN_ROUND" && (
        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-bold">טבלת ניקוד</span>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={state.showLeaderboard}
                onChange={(e) => call("host:toggleLeaderboard", { show: e.target.checked })}
              />
              הצג במסך ההקרנה
            </label>
          </div>
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
            {state.participants.map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                <span className="flex-1 truncate">{p.name}</span>
                <span className="font-bold tabular-nums w-10 text-center">{p.score}</span>
                <button
                  className="w-7 h-7 rounded-full bg-brand-navy-lighter"
                  onClick={() => call("host:adjustScore", { participantId: p.id, delta: -1 })}
                >
                  −
                </button>
                <button
                  className="w-7 h-7 rounded-full bg-brand-navy-lighter"
                  onClick={() => call("host:adjustScore", { participantId: p.id, delta: 1 })}
                >
                  +
                </button>
              </div>
            ))}
          </div>
          <Button variant="secondary" size="sm" disabled={busy} onClick={() => call("host:resetScores")}>
            איפוס ניקוד
          </Button>
        </Card>
      )}
    </main>
  );
}

function HostResultPanel({
  result,
  onMarkWinner,
  onAnonymousNext,
  onAnonymousHide,
  modAnswers,
  onOpenModeration,
  busy,
}: {
  result: NonNullable<PublicSessionState["result"]>;
  onMarkWinner: (optionId: string) => void;
  onAnonymousNext: () => void;
  onAnonymousHide: (answerId: string, hidden: boolean) => void;
  modAnswers: ModAnswer[] | null;
  onOpenModeration: () => void;
  busy: boolean;
}) {
  if (result.kind === "MOST_LIKELY" || result.kind === "AWARDS") {
    const r = result as MostLikelyResult;
    return <TallyList tally={r.tally} winnerKeys={r.winnerKeys} />;
  }
  if (result.kind === "WHO_SAID_IT" || result.kind === "TRIVIA") {
    const r = result as ChoiceResult;
    return <TallyList tally={r.tally} correctKey={r.correctOptionId ?? undefined} />;
  }
  if (result.kind === "HEAD_TO_HEAD") {
    const r = result as HeadToHeadResult;
    return (
      <div className="flex flex-col gap-3">
        <TallyList
          tally={r.contestants.map((c) => ({ key: c.optionId, label: c.name, votes: c.votes }))}
          winnerKeys={r.winnerOptionId ? [r.winnerOptionId] : []}
        />
        {!r.winnerOptionId && (
          <div className="flex flex-col gap-2">
            <p className="text-brand-muted text-sm">אחרי שהאתגר בוצע בפועל - מי ניצח?</p>
            <div className="flex gap-2">
              {r.contestants.map((c) => (
                <Button key={c.optionId} disabled={busy} onClick={() => onMarkWinner(c.optionId)}>
                  {c.name} ניצח/ה
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
  if (result.kind === "ANONYMOUS_PROMPT") {
    const r = result as AnonymousPromptResult;
    const visible = r.answers.filter((a) => !a.hidden);
    const current = visible[r.shownIndex];
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-xl bg-brand-navy-lighter px-4 py-4 text-center font-semibold">
          {current ? `"${current.text}"` : "אין תשובות להצגה"}
        </div>
        <p className="text-brand-muted text-xs text-center">
          {visible.length ? r.shownIndex + 1 : 0} / {visible.length}
        </p>
        <div className="flex gap-2">
          <Button disabled={busy || r.shownIndex >= visible.length - 1} onClick={onAnonymousNext}>
            הצג את הבאה ➡
          </Button>
          <Button variant="secondary" onClick={onOpenModeration}>
            👁️ moderation
          </Button>
        </div>
        {modAnswers && (
          <div className="flex flex-col gap-1 max-h-56 overflow-y-auto border-t border-brand-gold/20 pt-2">
            {modAnswers.map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-sm">
                <span className="flex-1 truncate">
                  <span className="text-brand-muted">{a.authorName}:</span> {a.text}
                </span>
                <button
                  className="text-xs px-2 py-1 rounded bg-brand-navy-lighter"
                  onClick={() => onAnonymousHide(a.id, !a.hidden)}
                >
                  {a.hidden ? "הצג" : "הסתר"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
  return null;
}
