"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Option, Round } from "@prisma/client";
import { Button } from "@/components/ui/Button";
import {
  OPTION_BASED_TYPES,
  PARTICIPANT_TARGET_TYPES,
  ROUND_TYPE_LABELS,
  type RoundType,
} from "@/types/game";
import { deleteRound, replaceOptions, updateRound } from "../../actions";

type RoundWithOptions = Round & { options: Option[] };

function getImageUrl(config: string | null): string {
  if (!config) return "";
  try {
    const parsed = JSON.parse(config) as { imageUrl?: unknown };
    return typeof parsed.imageUrl === "string" ? parsed.imageUrl : "";
  } catch {
    return "";
  }
}

export function RoundCard({ round, index }: { round: RoundWithOptions; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: round.id,
  });
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(round.title ?? "");
  const [questionText, setQuestionText] = useState(round.questionText);
  const [imageUrl, setImageUrl] = useState(getImageUrl(round.config));
  const [timeLimitSec, setTimeLimitSec] = useState<string>(round.timeLimitSec?.toString() ?? "");
  const [allowSelfVote, setAllowSelfVote] = useState(round.allowSelfVote);
  const [scoringEnabled, setScoringEnabled] = useState(round.scoringEnabled);
  const [options, setOptions] = useState(round.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })));

  const type = round.type as RoundType;
  const isOptionBased = OPTION_BASED_TYPES.includes(type);
  const isParticipantTarget = PARTICIPANT_TARGET_TYPES.includes(type);
  const isHeadToHead = type === "HEAD_TO_HEAD";

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  function handleSave() {
    if (!questionText.trim()) return;
    startTransition(async () => {
      await updateRound(round.id, {
        title: title.trim() || null,
        questionText: questionText.trim(),
        timeLimitSec: timeLimitSec ? Number(timeLimitSec) : null,
        allowSelfVote,
        scoringEnabled,
        imageUrl: imageUrl.trim() || null,
      });
      if (isOptionBased || isHeadToHead) {
        await replaceOptions(round.id, options);
      }
      router.refresh();
      setExpanded(false);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteRound(round.id);
      router.refresh();
    });
  }

  function updateOption(idx: number, patch: Partial<{ text: string; isCorrect: boolean }>) {
    setOptions((prev) => prev.map((o, i) => (i === idx ? { ...o, ...patch } : o)));
  }
  function setSingleCorrect(idx: number) {
    setOptions((prev) => prev.map((o, i) => ({ ...o, isCorrect: i === idx })));
  }
  function addOption() {
    setOptions((prev) => [...prev, { text: "", isCorrect: false }]);
  }
  function removeOption(idx: number) {
    setOptions((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="card-glass rounded-2xl p-4 flex flex-col gap-3"
    >
      <div className="flex items-center gap-3">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-brand-muted text-xl px-1"
          aria-label="גרירה לשינוי סדר"
        >
          ⠿
        </button>
        <span className="text-brand-muted text-sm w-6">{index + 1}</span>
        <span className="text-xs rounded-full bg-brand-gold/15 text-brand-gold px-3 py-1 font-bold shrink-0">
          {ROUND_TYPE_LABELS[type]}
        </span>
        <span className="flex-1 truncate">{round.questionText || "(ללא טקסט עדיין)"}</span>
        <button className="text-brand-gold text-sm underline shrink-0" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "סגור" : "עריכה"}
        </button>
        <button className="text-brand-danger text-sm underline shrink-0" onClick={handleDelete} disabled={pending}>
          מחיקה
        </button>
      </div>

      {expanded && (
        <div className="flex flex-col gap-3 pt-2 border-t border-brand-gold/15">
          {type === "AWARDS" && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-brand-muted">שם הקטגוריה (למסך הסיום)</span>
              <input
                className="rounded-lg bg-brand-navy-lighter px-3 py-2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
          )}

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-brand-muted">טקסט השאלה</span>
            <textarea
              className="rounded-lg bg-brand-navy-lighter px-3 py-2 resize-none"
              rows={2}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-brand-muted">תמונה לשאלה (כתובת באתר, לא חובה)</span>
            <input
              className="rounded-lg bg-brand-navy-lighter px-3 py-2"
              placeholder="/images/example.jpg"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              dir="ltr"
            />
          </label>
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt="תצוגה מקדימה לשאלה"
              className="max-h-56 w-auto self-center rounded-xl border border-brand-gold/20 object-contain"
            />
          )}

          <div className="flex flex-wrap gap-4 items-center">
            <label className="flex items-center gap-2 text-sm">
              <span className="text-brand-muted">זמן (שניות, ריק=ללא הגבלה)</span>
              <input
                type="number"
                min={0}
                className="w-20 rounded-lg bg-brand-navy-lighter px-2 py-1"
                value={timeLimitSec}
                onChange={(e) => setTimeLimitSec(e.target.value)}
              />
            </label>
            {isParticipantTarget && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={allowSelfVote} onChange={(e) => setAllowSelfVote(e.target.checked)} />
                מותר להצביע לעצמך
              </label>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={scoringEnabled}
                onChange={(e) => setScoringEnabled(e.target.checked)}
              />
              יש ניקוד
            </label>
          </div>

          {(isOptionBased || isHeadToHead) && (
            <div className="flex flex-col gap-2">
              <p className="text-brand-muted text-sm">
                {isHeadToHead ? "שני המתמודדים" : "אפשרויות תשובה (סמנו את הנכונה)"}
              </p>
              {options.map((o, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  {!isHeadToHead && (
                    <input
                      type="radio"
                      name={`correct-${round.id}`}
                      checked={o.isCorrect}
                      onChange={() => setSingleCorrect(idx)}
                    />
                  )}
                  <input
                    className="flex-1 rounded-lg bg-brand-navy-lighter px-3 py-2 text-sm"
                    placeholder={isHeadToHead ? `מתמודד/ת ${idx + 1}` : `אפשרות ${idx + 1}`}
                    value={o.text}
                    onChange={(e) => updateOption(idx, { text: e.target.value })}
                  />
                  {!isHeadToHead && options.length > 2 && (
                    <button className="text-brand-danger text-sm" onClick={() => removeOption(idx)}>
                      ×
                    </button>
                  )}
                </div>
              ))}
              {!isHeadToHead && (
                <button className="text-brand-gold text-sm underline self-start" onClick={addOption}>
                  + הוספת אפשרות
                </button>
              )}
            </div>
          )}

          <Button size="sm" disabled={pending || !questionText.trim()} onClick={handleSave}>
            {pending ? "שומר..." : "שמירה"}
          </Button>
        </div>
      )}
    </div>
  );
}
