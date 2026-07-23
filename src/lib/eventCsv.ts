import Papa from "papaparse";
import {
  DEFAULT_SCORING_ENABLED,
  OPTION_BASED_TYPES,
  ROUND_TYPE_LABELS,
  ROUND_TYPES,
  type RoundType,
} from "@/types/game";

export interface CsvRoundOption {
  text: string;
  isCorrect: boolean;
}

export interface CsvRound {
  type: RoundType;
  title: string | null;
  questionText: string;
  timeLimitSec: number | null;
  allowSelfVote: boolean;
  scoringEnabled: boolean;
  options: CsvRoundOption[];
}

const COLUMNS = [
  "סוג",
  "כותרת",
  "שאלה",
  "זמן_שניות",
  "הצבעה_עצמית",
  "ניקוד",
  "אפשרות_1",
  "נכונה_1",
  "אפשרות_2",
  "נכונה_2",
  "אפשרות_3",
  "נכונה_3",
  "אפשרות_4",
  "נכונה_4",
] as const;

const LABEL_TO_TYPE = new Map<string, RoundType>(ROUND_TYPES.map((t) => [ROUND_TYPE_LABELS[t], t]));

const TRUTHY = new Set(["כן", "v", "x", "1", "true", "yes", "נכון", "✓"]);
function isTruthy(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return TRUTHY.has(value.trim().toLowerCase());
}

export interface RoundsForExport {
  type: string;
  title: string | null;
  questionText: string;
  timeLimitSec: number | null;
  allowSelfVote: boolean;
  scoringEnabled: boolean;
  options: { text: string; isCorrect: boolean; order: number }[];
}

export function roundsToCsv(rounds: RoundsForExport[]): string {
  const rows = rounds.map((r) => {
    const opts = [...r.options].sort((a, b) => a.order - b.order);
    const row: Record<string, string> = {
      סוג: ROUND_TYPE_LABELS[r.type as RoundType] ?? r.type,
      כותרת: r.title ?? "",
      שאלה: r.questionText,
      זמן_שניות: r.timeLimitSec != null ? String(r.timeLimitSec) : "",
      הצבעה_עצמית: r.allowSelfVote ? "כן" : "",
      ניקוד: r.scoringEnabled ? "כן" : "",
    };
    for (let i = 0; i < 4; i++) {
      row[`אפשרות_${i + 1}`] = opts[i]?.text ?? "";
      row[`נכונה_${i + 1}`] = opts[i]?.isCorrect ? "כן" : "";
    }
    return row;
  });
  const csv = Papa.unparse({ fields: [...COLUMNS], data: rows });
  return "﻿" + csv; // UTF-8 BOM so Excel shows Hebrew correctly
}

export interface CsvParseResult {
  rounds: CsvRound[];
  errors: string[];
}

export function csvToRounds(csvText: string): CsvParseResult {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const errors: string[] = [];
  if (parsed.errors.length) {
    for (const e of parsed.errors) errors.push(`שורה ${(e.row ?? 0) + 2}: שגיאת פענוח - ${e.message}`);
  }

  const rounds: CsvRound[] = [];
  parsed.data.forEach((rawRow, idx) => {
    const rowNum = idx + 2; // +1 for header, +1 for 1-indexed
    const typeLabel = (rawRow["סוג"] ?? "").trim();
    const questionText = (rawRow["שאלה"] ?? "").trim();
    if (!typeLabel && !questionText) return; // fully blank row, skip silently

    const type = LABEL_TO_TYPE.get(typeLabel);
    if (!type) {
      errors.push(
        `שורה ${rowNum}: סוג לא מזוהה "${typeLabel}". חייב להיות אחד מ: ${ROUND_TYPES.map((t) => ROUND_TYPE_LABELS[t]).join(", ")}`
      );
      return;
    }
    if (!questionText) {
      errors.push(`שורה ${rowNum}: חסר טקסט שאלה`);
      return;
    }

    const timeLimitRaw = (rawRow["זמן_שניות"] ?? "").trim();
    let timeLimitSec: number | null = null;
    if (timeLimitRaw) {
      const n = Number(timeLimitRaw);
      if (Number.isNaN(n) || n < 0) {
        errors.push(`שורה ${rowNum}: זמן_שניות חייב להיות מספר חיובי או ריק (התקבל "${timeLimitRaw}")`);
      } else {
        timeLimitSec = n;
      }
    }

    const options: CsvRoundOption[] = [];
    if (OPTION_BASED_TYPES.includes(type) || type === "HEAD_TO_HEAD") {
      for (let i = 1; i <= 4; i++) {
        const text = (rawRow[`אפשרות_${i}`] ?? "").trim();
        if (!text) continue;
        options.push({ text, isCorrect: isTruthy(rawRow[`נכונה_${i}`]) });
      }
      if (type === "HEAD_TO_HEAD") {
        if (options.length !== 2) {
          errors.push(`שורה ${rowNum}: "הימור צוותי" חייב בדיוק 2 מתמודדים (אפשרות_1, אפשרות_2)`);
        }
        // No "correct" marking expected here - the winner is decided live during the event.
      } else if (type === "TRIVIA" || type === "WHO_SAID_IT") {
        if (options.length < 2) {
          errors.push(`שורה ${rowNum}: צריך לפחות 2 אפשרויות תשובה`);
        } else if (!options.some((o) => o.isCorrect)) {
          errors.push(`שורה ${rowNum}: אף אפשרות לא מסומנת כ"נכונה"`);
        } else if (options.filter((o) => o.isCorrect).length > 1) {
          errors.push(`שורה ${rowNum}: יותר מאפשרות אחת מסומנת כ"נכונה" - צריך בדיוק אחת`);
        }
      }
    }

    rounds.push({
      type,
      title: (rawRow["כותרת"] ?? "").trim() || null,
      questionText,
      timeLimitSec,
      allowSelfVote: isTruthy(rawRow["הצבעה_עצמית"]),
      scoringEnabled: rawRow["ניקוד"] !== undefined && rawRow["ניקוד"].trim() !== ""
        ? isTruthy(rawRow["ניקוד"])
        : DEFAULT_SCORING_ENABLED[type],
      options,
    });
  });

  if (!rounds.length && !errors.length) {
    errors.push("לא נמצאו שורות שאלה בקובץ");
  }

  return { rounds, errors };
}
