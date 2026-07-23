-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "allowSelfVoteDefault" BOOLEAN NOT NULL DEFAULT false,
    "soundEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Round" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT,
    "questionText" TEXT NOT NULL,
    "timeLimitSec" INTEGER,
    "allowSelfVote" BOOLEAN NOT NULL DEFAULT false,
    "scoringEnabled" BOOLEAN NOT NULL DEFAULT false,
    "config" TEXT,
    CONSTRAINT "Round_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Option" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roundId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,
    CONSTRAINT "Option_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "joinCode" TEXT NOT NULL,
    "hostToken" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'LOBBY',
    "currentRoundIndex" INTEGER NOT NULL DEFAULT -1,
    "currentRoundPhase" TEXT NOT NULL DEFAULT 'IDLE',
    "showLeaderboard" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "deviceToken" TEXT NOT NULL,
    "connected" BOOLEAN NOT NULL DEFAULT true,
    "removed" BOOLEAN NOT NULL DEFAULT false,
    "score" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Participant_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "targetParticipantId" TEXT,
    "optionId" TEXT,
    "contestantChoice" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Vote_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Vote_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Vote_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Vote_targetParticipantId_fkey" FOREIGN KEY ("targetParticipantId") REFERENCES "Participant" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Vote_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "Option" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AnonymousAnswer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "shownAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnonymousAnswer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AnonymousAnswer_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AnonymousAnswer_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RoundResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "resultJson" TEXT NOT NULL,
    "revealedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RoundResult_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RoundResult_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Round_eventId_order_idx" ON "Round"("eventId", "order");

-- CreateIndex
CREATE INDEX "Option_roundId_idx" ON "Option"("roundId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_joinCode_key" ON "Session"("joinCode");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_deviceToken_key" ON "Participant"("deviceToken");

-- CreateIndex
CREATE INDEX "Participant_sessionId_idx" ON "Participant"("sessionId");

-- CreateIndex
CREATE INDEX "Vote_sessionId_roundId_idx" ON "Vote"("sessionId", "roundId");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_sessionId_roundId_participantId_key" ON "Vote"("sessionId", "roundId", "participantId");

-- CreateIndex
CREATE INDEX "AnonymousAnswer_sessionId_roundId_idx" ON "AnonymousAnswer"("sessionId", "roundId");

-- CreateIndex
CREATE UNIQUE INDEX "AnonymousAnswer_sessionId_roundId_participantId_key" ON "AnonymousAnswer"("sessionId", "roundId", "participantId");

-- CreateIndex
CREATE UNIQUE INDEX "RoundResult_sessionId_roundId_key" ON "RoundResult"("sessionId", "roundId");
