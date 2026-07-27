import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { csvToRounds } from "../src/lib/eventCsv";

const prisma = new PrismaClient();

const EVENT_NAME = "ערב גיבוש – צוות 2";

type OptionSeed = { text: string; isCorrect?: boolean };
type RoundSeed = {
  type: string;
  title?: string;
  questionText: string;
  timeLimitSec?: number;
  allowSelfVote?: boolean;
  scoringEnabled?: boolean;
  options?: OptionSeed[];
};

const MOST_LIKELY: RoundSeed[] = [
  { type: "MOST_LIKELY", questionText: 'מי הכי סביר שיהיה מג"ד?', timeLimitSec: 20 },
  { type: "MOST_LIKELY", questionText: "מי הכי סביר להתעורר ב-12 ביום שחרור?", timeLimitSec: 20 },
  { type: "MOST_LIKELY", questionText: "מי בצוות שכולם סומכים עליו אבל הוא עצמו לא בטוח בזה?", timeLimitSec: 20 },
  { type: "MOST_LIKELY", questionText: "מי הכי מסוגל לשכנע את המפקד בדבר שגוי?", timeLimitSec: 20 },
  { type: "MOST_LIKELY", questionText: "מי הכי סביר לבכות מרגש בטקס סיום הקורס?", timeLimitSec: 20 },
  { type: "MOST_LIKELY", questionText: "מי הכי סביר להירדם באמצע תדריך?", timeLimitSec: 20 },
  {
    type: "MOST_LIKELY",
    questionText: 'מי הכי סביר לזכור בעל פה את כל הפקודות חוץ מהשם שלו על הדו"ח?',
    timeLimitSec: 20,
  },
  { type: "MOST_LIKELY", questionText: "מי הכי סביר לפתוח קבוצת וואטסאפ נוסטלגית עוד 10 שנים?", timeLimitSec: 20 },
];

const WHO_SAID_IT: RoundSeed[] = [
  {
    type: "WHO_SAID_IT",
    title: "מי אמר את זה?",
    questionText: '"עזבו, אין מצב שאנחנו מסיימים בזמן."',
    timeLimitSec: 15,
    scoringEnabled: true,
    options: [
      { text: "אריאל", isCorrect: true },
      { text: "מוטי" },
      { text: "שירה" },
      { text: "דניאל" },
    ],
  },
  {
    type: "WHO_SAID_IT",
    title: "מי אמר את זה?",
    questionText: '"אם הייתי מ\\"פ הייתי משנה את כל השיטה."',
    timeLimitSec: 15,
    scoringEnabled: true,
    options: [
      { text: "יובל" },
      { text: "נועה", isCorrect: true },
      { text: "עומר" },
      { text: "טל" },
    ],
  },
  {
    type: "WHO_SAID_IT",
    title: "מי אמר את זה?",
    questionText: '"תעזבו אותי, אני עוד חמש דקות ישן."',
    timeLimitSec: 15,
    scoringEnabled: true,
    options: [
      { text: "רועי" },
      { text: "מאיה" },
      { text: "איתי", isCorrect: true },
      { text: "שני" },
    ],
  },
  {
    type: "WHO_SAID_IT",
    title: "מי אמר את זה?",
    questionText: '"בואו נעשה את זה יפה, לא מהר."',
    timeLimitSec: 15,
    scoringEnabled: true,
    options: [
      { text: "בר" },
      { text: "גיא" },
      { text: "הדר" },
      { text: "ליאור", isCorrect: true },
    ],
  },
  {
    type: "WHO_SAID_IT",
    title: "מי אמר את זה?",
    questionText: '"סמכו עליי, אני יודע בדיוק לאן ללכת."',
    timeLimitSec: 15,
    scoringEnabled: true,
    options: [
      { text: "נדב", isCorrect: true },
      { text: "אור" },
      { text: "דניאל" },
      { text: "טל" },
    ],
  },
];

const TRIVIA: RoundSeed[] = [
  {
    type: "TRIVIA",
    questionText: "מי גר הכי רחוק מהבסיס?",
    timeLimitSec: 15,
    scoringEnabled: true,
    options: [
      { text: "אריאל - אילת" },
      { text: "מוטי - קריית שמונה", isCorrect: true },
      { text: "שירה - באר שבע" },
      { text: "דניאל - חיפה" },
    ],
  },
  {
    type: "TRIVIA",
    questionText: "מי הגיע לקורס אחרי תואר בהנדסה?",
    timeLimitSec: 15,
    scoringEnabled: true,
    options: [
      { text: "יובל" },
      { text: "נועה" },
      { text: "עומר", isCorrect: true },
      { text: "טל" },
    ],
  },
  {
    type: "TRIVIA",
    questionText: "מי מנגן בגיטרה?",
    timeLimitSec: 15,
    scoringEnabled: true,
    options: [
      { text: "רועי", isCorrect: true },
      { text: "מאיה" },
      { text: "איתי" },
      { text: "שני" },
    ],
  },
  {
    type: "TRIVIA",
    questionText: "מי היה קפטן קבוצת הכדורסל בתיכון?",
    timeLimitSec: 15,
    scoringEnabled: true,
    options: [
      { text: "בר" },
      { text: "גיא", isCorrect: true },
      { text: "הדר" },
      { text: "ליאור" },
    ],
  },
  {
    type: "TRIVIA",
    questionText: "למי יש אח תאום?",
    timeLimitSec: 15,
    scoringEnabled: true,
    options: [
      { text: "נדב" },
      { text: "אור" },
      { text: "דניאל", isCorrect: true },
      { text: "טל" },
    ],
  },
  {
    type: "TRIVIA",
    questionText: "מי טבעוני?",
    timeLimitSec: 15,
    scoringEnabled: true,
    options: [
      { text: "אריאל" },
      { text: "שירה", isCorrect: true },
      { text: "יובל" },
      { text: "מאיה" },
    ],
  },
  {
    type: "TRIVIA",
    questionText: "מי טס לחו״ל הכי הרבה פעמים בשנה האחרונה?",
    timeLimitSec: 15,
    scoringEnabled: true,
    options: [
      { text: "עומר", isCorrect: true },
      { text: "רועי" },
      { text: "בר" },
      { text: "הדר" },
    ],
  },
  {
    type: "TRIVIA",
    questionText: "מי מדבר עוד שפה חוץ מעברית ואנגלית?",
    timeLimitSec: 15,
    scoringEnabled: true,
    options: [
      { text: "ליאור" },
      { text: "נדב" },
      { text: "אור", isCorrect: true },
      { text: "איתי" },
    ],
  },
];

const HEAD_TO_HEAD: RoundSeed[] = [
  {
    type: "HEAD_TO_HEAD",
    questionText: "מי ינצח בתחרות שכיבות סמיכה?",
    scoringEnabled: true,
    options: [{ text: "אריאל" }, { text: "מוטי" }],
  },
  {
    type: "HEAD_TO_HEAD",
    questionText: "מי ינצח בתחרות אכילת חצי לימון בלי להעווה פנים?",
    scoringEnabled: true,
    options: [{ text: "נועה" }, { text: "עומר" }],
  },
  {
    type: "HEAD_TO_HEAD",
    questionText: "מי ינצח בקרב פיטבול (הכי טוב מחקה בעל חיים)?",
    scoringEnabled: true,
    options: [{ text: "רועי" }, { text: "איתי" }],
  },
];

const ANONYMOUS_PROMPT: RoundSeed[] = [
  { type: "ANONYMOUS_PROMPT", questionText: "הדבר שאני הכי אזכור מהקורס הוא...", timeLimitSec: 60 },
  {
    type: "ANONYMOUS_PROMPT",
    questionText: "אם צוות 2 היה סדרת טלוויזיה, היו קוראים לה...",
    timeLimitSec: 60,
  },
  {
    type: "ANONYMOUS_PROMPT",
    questionText: 'המשפט שהכי הרבה פעמים שמעתי במסדר בוקר הוא...',
    timeLimitSec: 60,
  },
  { type: "ANONYMOUS_PROMPT", questionText: "הרגע הכי מצחיק שקרה לנו בשטח היה...", timeLimitSec: 60 },
  { type: "ANONYMOUS_PROMPT", questionText: "הדבר שהכי הפתיע אותי בקצונה הוא...", timeLimitSec: 60 },
];

const AWARDS: RoundSeed[] = [
  { type: "AWARDS", title: "הכי כריזמטי", questionText: "פרס: הכי כריזמטי/ת 🎤", timeLimitSec: 20 },
  { type: "AWARDS", title: "הראשון להתנדב", questionText: "פרס: הראשון/ה להתנדב ✋", timeLimitSec: 20 },
  { type: "AWARDS", title: "אלוף האלתורים", questionText: "פרס: אלוף/ת האלתורים 🎭", timeLimitSec: 20 },
  {
    type: "AWARDS",
    title: "האיש שתמיד יודע מה קורה",
    questionText: "פרס: האיש/ה שתמיד יודע/ת מה קורה 📡",
    timeLimitSec: 20,
  },
  {
    type: "AWARDS",
    title: 'הכי סביר שיהפוך למח"ט',
    questionText: 'פרס: הכי סביר/ה שיהפוך/תהפוך למח"ט 🎖️',
    timeLimitSec: 20,
  },
  { type: "AWARDS", title: "הלב של הצוות", questionText: "פרס: הלב של הצוות ❤️", timeLimitSec: 20 },
];

const ALL_ROUNDS: RoundSeed[] = [
  ...MOST_LIKELY,
  ...WHO_SAID_IT,
  ...TRIVIA,
  ...HEAD_TO_HEAD,
  ...ANONYMOUS_PROMPT,
  ...AWARDS,
];

const defaultCsv = readFileSync(join(process.cwd(), "prisma", "default-event.csv"), "utf8");
const parsedDefault = csvToRounds(defaultCsv);
if (parsedDefault.errors.length) {
  throw new Error(`קובץ שאלות ברירת המחדל אינו תקין:\n${parsedDefault.errors.join("\n")}`);
}
const DEFAULT_ROUNDS = parsedDefault.rounds;

async function main() {
  const event =
    (await prisma.event.findFirst({ where: { name: EVENT_NAME } })) ??
    (await prisma.event.create({
      data: { name: EVENT_NAME, allowSelfVoteDefault: false, soundEnabled: true },
    }));

  const existingRounds = await prisma.round.findMany({
    where: { eventId: event.id },
    select: { questionText: true, order: true },
  });
  const existingQuestions = new Set(existingRounds.map((round) => round.questionText));
  let nextOrder = existingRounds.reduce((max, round) => Math.max(max, round.order), -1) + 1;
  let added = 0;

  for (const r of DEFAULT_ROUNDS) {
    if (existingQuestions.has(r.questionText)) continue;
    await prisma.round.create({
      data: {
        eventId: event.id,
        type: r.type,
        order: nextOrder++,
        title: r.title ?? null,
        questionText: r.questionText,
        timeLimitSec: r.timeLimitSec ?? null,
        allowSelfVote: r.allowSelfVote ?? false,
        scoringEnabled: r.scoringEnabled ?? false,
        config: r.imageUrl ? JSON.stringify({ imageUrl: r.imageUrl }) : null,
        options: r.options
          ? {
              create: r.options.map((o, idx) => ({
                text: o.text,
                isCorrect: !!o.isCorrect,
                order: idx,
              })),
            }
          : undefined,
      },
    });
    existingQuestions.add(r.questionText);
    added++;
  }

  console.log(
    added
      ? `✅ נוספו ${added} סבבים חדשים לאירוע "${EVENT_NAME}" בלי לשנות או למחוק את התוכן הקיים.`
      : `האירוע "${EVENT_NAME}" כבר מעודכן — לא בוצעו שינויים בתוכן.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
