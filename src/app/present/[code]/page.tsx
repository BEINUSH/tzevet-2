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

const INTRO_SLIDES = [
  {
    eyebrow: "פלוגה א׳ · גדוד יואב",
    title: "קורס קציני זו״ק",
    text: "מקצועות הזיהוי, הסריקה והקבורה",
  },
  {
    eyebrow: "כבודם של חללי צה״ל",
    title: "יחידות שונות. שליחות אחת.",
    text: "יס״ר · מאנ״ח · אגד המח״ץ · חמ״לים · יחק״ז · נמ״ח · מלב״ח",
  },
  {
    eyebrow: "רגע, כמעט שכחנו…",
    title: "וכן, כן — גם יס״ר אוויר!",
    text: "כולם כאן. עכשיו נראה כמה אתם באמת מכירים זה את זה.",
    shout: true,
  },
  {
    eyebrow: "בעוד שבוע",
    title: "דרגות על הכתפיים",
    text: "יוצאים לפקד בצניעות ובעוצמה — למען קדושי צה״ל",
  },
  {
    eyebrow: "איך הערב עובד?",
    title: "שלושה צוותים. פלוגה אחת.",
    text: "תשובה נכונה על צוות אחר מזכה בבונוס · אחרי כל צוות עוצרים למקום ראשון ושני · בסוף מוכתר מנצח הערב",
  },
] as const;

export default function PresentPage() {
  const params = useParams<{ code: string }>();
  const code = (params.code || "").toUpperCase();
  const sound = useSound();

  const [state, setState] = useState<PublicSessionState | null>(null);
  const [error, setError] = useState("");
  const [joinUrl, setJoinUrl] = useState("");
  const [narrationEnabled, setNarrationEnabled] = useState(false);

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

  function speakSlide(slide: (typeof INTRO_SLIDES)[number]) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(`${slide.eyebrow}. ${slide.title}. ${slide.text}`);
    utterance.lang = "he-IL";
    utterance.rate = "shout" in slide && slide.shout ? 0.9 : 0.82;
    utterance.pitch = "shout" in slide && slide.shout ? 1.28 : 1;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
  }

  useEffect(() => {
    if (!narrationEnabled || !state || state.status !== "IN_ROUND" || state.roundIndex >= 0) return;
    const slide = INTRO_SLIDES[state.roundIndex + INTRO_SLIDES.length];
    if (!slide) return;
    speakSlide(slide);
    return () => window.speechSynthesis.cancel();
  }, [narrationEnabled, state?.status, state?.roundIndex]);

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

  const checkpointRound = state.status === "IN_ROUND" && state.showLeaderboard;
  const checkpointLeaders = [...state.participants].sort((a, b) => b.score - a.score).slice(0, 2);
  const introSlide =
    state.status === "IN_ROUND" && state.roundIndex < 0
      ? INTRO_SLIDES[state.roundIndex + INTRO_SLIDES.length]
      : null;

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
        {introSlide ? (
          <motion.div
            key={`intro-${state.roundIndex}`}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.7 }}
            className="flex-1 flex flex-col items-center justify-center gap-8 text-center relative"
          >
            <div className="absolute inset-0 -z-10 opacity-40">
              <div className="absolute top-[15%] right-[12%] h-72 w-72 rounded-full bg-brand-gold/20 blur-3xl" />
              <div className="absolute bottom-[10%] left-[10%] h-96 w-96 rounded-full bg-blue-900/40 blur-3xl" />
            </div>
            <p className="text-3xl md:text-4xl font-bold text-brand-gold">{introSlide.eyebrow}</p>
            <h1 className={`font-black gold-text leading-tight ${"shout" in introSlide && introSlide.shout ? "text-7xl md:text-9xl" : "text-6xl md:text-8xl"}`}>
              {introSlide.title}
            </h1>
            <p className="max-w-5xl text-3xl md:text-5xl font-semibold leading-relaxed text-brand-white/90">
              {introSlide.text}
            </p>
            {!narrationEnabled && (
              <button
                type="button"
                onClick={() => {
                  setNarrationEnabled(true);
                  speakSlide(introSlide);
                }}
                className="rounded-2xl border-2 border-brand-gold bg-brand-gold px-8 py-4 text-2xl font-black text-brand-navy shadow-xl"
              >
                🔊 הפעל קריינות
              </button>
            )}
            {narrationEnabled && (
              <button
                type="button"
                onClick={() => speakSlide(introSlide)}
                className="rounded-xl border border-brand-gold/40 px-5 py-2 font-bold text-brand-gold"
              >
                🔁 הקרא שוב
              </button>
            )}
            <div className="mt-4 flex gap-3">
              {INTRO_SLIDES.map((_, index) => (
                <span
                  key={index}
                  className={`h-2 rounded-full transition-all ${
                    index === state.roundIndex + INTRO_SLIDES.length ? "w-14 bg-brand-gold" : "w-5 bg-brand-gold/25"
                  }`}
                />
              ))}
            </div>
          </motion.div>
        ) : checkpointRound ? (
          <motion.div key={`checkpoint-${state.roundIndex}`} {...fade} className="flex-1 flex flex-col items-center justify-center gap-8 text-center">
            <p className="text-3xl text-brand-muted">עצירת סיכום · סיימנו מקטע צוותי</p>
            <h1 className="text-6xl font-black gold-text">🏅 מובילי הביניים</h1>
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
            <p className="text-2xl text-brand-muted">ידע על צוות אחר שווה יותר — הכול עדיין פתוח!</p>
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
