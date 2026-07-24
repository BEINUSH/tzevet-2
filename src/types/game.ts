export const MAX_PARTICIPANTS = 20;

export const ROUND_TYPES = [
  "MOST_LIKELY",
  "WHO_SAID_IT",
  "TRIVIA",
  "HEAD_TO_HEAD",
  "ANONYMOUS_PROMPT",
  "AWARDS",
] as const;
export type RoundType = (typeof ROUND_TYPES)[number];

export const ROUND_TYPE_LABELS: Record<RoundType, string> = {
  MOST_LIKELY: 'מי הכי...?',
  WHO_SAID_IT: "מי אמר את זה?",
  TRIVIA: "כמה אתם מכירים את הצוות?",
  HEAD_TO_HEAD: "הימור צוותי",
  ANONYMOUS_PROMPT: "תשובות אנונימיות",
  AWARDS: "פרסי הצוות",
};

// Round types whose default is to award points automatically.
export const DEFAULT_SCORING_ENABLED: Record<RoundType, boolean> = {
  MOST_LIKELY: false,
  WHO_SAID_IT: true,
  TRIVIA: true,
  HEAD_TO_HEAD: true,
  ANONYMOUS_PROMPT: false,
  AWARDS: false,
};

// Round types where the participant picks one of the other participants
// (rather than one of a fixed set of Options).
export const PARTICIPANT_TARGET_TYPES: RoundType[] = ["MOST_LIKELY", "AWARDS"];
// Round types backed by Round.options (multiple choice).
export const OPTION_BASED_TYPES: RoundType[] = ["WHO_SAID_IT", "TRIVIA", "HEAD_TO_HEAD"];

export type SessionStatus = "LOBBY" | "IN_ROUND" | "FINAL_AWARDS" | "ENDED";
export type RoundPhase = "IDLE" | "VOTING_OPEN" | "VOTING_CLOSED" | "REVEALED" | "DONE";

export interface PublicParticipant {
  id: string;
  name: string;
  connected: boolean;
  score: number;
}

export interface PublicOption {
  id: string;
  text: string;
  order: number;
}

export interface PublicRound {
  id: string;
  type: RoundType;
  title: string | null;
  questionText: string;
  imageUrl: string | null;
  timeLimitSec: number | null;
  allowSelfVote: boolean;
  scoringEnabled: boolean;
  order: number;
  options: PublicOption[];
}

export interface TallyEntry {
  key: string; // participantId or optionId
  label: string;
  votes: number;
  isCorrect?: boolean;
  isWinnerContestant?: boolean;
}

export interface MostLikelyResult {
  kind: "MOST_LIKELY" | "AWARDS";
  tally: TallyEntry[];
  winnerKeys: string[];
  maxVotes: number;
}

export interface ChoiceResult {
  kind: "WHO_SAID_IT" | "TRIVIA";
  tally: TallyEntry[];
  correctOptionIds: string[];
  scored: Record<string, number>; // participantId -> points awarded
}

export interface HeadToHeadResult {
  kind: "HEAD_TO_HEAD";
  contestants: { optionId: string; name: string; votes: number }[];
  winnerOptionId: string | null;
  scored: Record<string, number>;
}

export interface AnonymousPromptResult {
  kind: "ANONYMOUS_PROMPT";
  answers: { id: string; text: string; hidden: boolean }[];
  shownIndex: number;
}

export type RoundResultPayload =
  | MostLikelyResult
  | ChoiceResult
  | HeadToHeadResult
  | AnonymousPromptResult;

export interface PublicSessionState {
  code: string;
  eventName: string;
  status: SessionStatus;
  roundIndex: number;
  totalRounds: number;
  roundPhase: RoundPhase;
  votingOpenedAt: string | null;
  round: PublicRound | null;
  participants: PublicParticipant[];
  votesCast: number;
  votesNeeded: number;
  result: RoundResultPayload | null;
  showLeaderboard: boolean;
  finalLeaderboard: PublicParticipant[] | null;
  allAwards: { roundTitle: string; winners: string[] }[] | null;
}
