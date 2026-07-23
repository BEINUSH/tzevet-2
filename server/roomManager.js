import crypto from "crypto";
import { QUESTIONS } from "./questions.js";

// Excludes visually-ambiguous characters (0/O, 1/I).
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const rooms = new Map();

function randomCode(length = 4) {
  let code;
  do {
    code = "";
    for (let i = 0; i < length; i++) {
      code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    }
  } while (rooms.has(code));
  return code;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createRoom() {
  const code = randomCode();
  const hostToken = crypto.randomUUID();
  const room = {
    code,
    hostToken,
    hostSocketId: null,
    phase: "lobby", // lobby | question | results | gameover
    players: new Map(), // id -> {id, name, token, socketId, connected, votesReceivedTotal}
    questionOrder: shuffle(QUESTIONS),
    roundIndex: -1,
    votes: new Map(), // voterId -> targetId
    roundHistory: [], // {question, tally: [{playerId, name, votes}]}
    lastResults: null,
    createdAt: Date.now(),
  };
  rooms.set(code, room);
  return room;
}

export function getRoom(code) {
  return rooms.get((code || "").toUpperCase());
}

export function addPlayer(room, name) {
  const id = crypto.randomUUID();
  const token = crypto.randomUUID();
  const player = {
    id,
    name: name.trim().slice(0, 20),
    token,
    socketId: null,
    connected: true,
    votesReceivedTotal: 0,
  };
  room.players.set(id, player);
  return player;
}

export function connectedPlayers(room) {
  return [...room.players.values()].filter((p) => p.connected);
}

export function publicPlayers(room) {
  return [...room.players.values()].map((p) => ({
    id: p.id,
    name: p.name,
    connected: p.connected,
  }));
}

export function currentQuestion(room) {
  if (room.roundIndex < 0 || room.roundIndex >= room.questionOrder.length) return null;
  return room.questionOrder[room.roundIndex];
}

export function totalRounds(room) {
  return room.questionOrder.length;
}

export function startGame(room) {
  room.phase = "question";
  room.roundIndex = 0;
  room.votes = new Map();
}

export function castVote(room, voterId, targetId) {
  if (room.phase !== "question") return false;
  if (!room.players.has(voterId) || !room.players.has(targetId)) return false;
  room.votes.set(voterId, targetId);
  return true;
}

export function votesNeeded(room) {
  return connectedPlayers(room).length;
}

export function votesCast(room) {
  return room.votes.size;
}

export function allVoted(room) {
  const connectedIds = new Set(connectedPlayers(room).map((p) => p.id));
  if (connectedIds.size === 0) return false;
  for (const id of connectedIds) {
    if (!room.votes.has(id)) return false;
  }
  return true;
}

export function computeResults(room) {
  const tallyMap = new Map();
  for (const p of room.players.values()) tallyMap.set(p.id, 0);
  for (const targetId of room.votes.values()) {
    tallyMap.set(targetId, (tallyMap.get(targetId) || 0) + 1);
  }
  const tally = [...tallyMap.entries()]
    .map(([playerId, votes]) => ({
      playerId,
      name: room.players.get(playerId)?.name || "?",
      votes,
    }))
    .sort((a, b) => b.votes - a.votes);

  const maxVotes = tally.length ? tally[0].votes : 0;
  const winners = maxVotes > 0 ? tally.filter((t) => t.votes === maxVotes).map((t) => t.playerId) : [];

  for (const winnerId of winners) {
    const p = room.players.get(winnerId);
    if (p) p.votesReceivedTotal += 1;
  }

  return { tally, winners, maxVotes };
}

export function finishRound(room) {
  if (room.phase !== "question") return room.lastResults;
  const results = computeResults(room);
  room.roundHistory.push({
    question: currentQuestion(room),
    tally: results.tally,
    winners: results.winners,
  });
  room.phase = "results";
  room.lastResults = results;
  return results;
}

export function nextRound(room) {
  room.roundIndex += 1;
  room.votes = new Map();
  if (room.roundIndex >= totalRounds(room)) {
    room.phase = "gameover";
  } else {
    room.phase = "question";
  }
}

export function finalLeaderboard(room) {
  return [...room.players.values()]
    .map((p) => ({ id: p.id, name: p.name, crowns: p.votesReceivedTotal }))
    .sort((a, b) => b.crowns - a.crowns);
}

export function serializeRoom(room) {
  return {
    code: room.code,
    phase: room.phase,
    players: publicPlayers(room),
    roundIndex: room.roundIndex,
    totalRounds: totalRounds(room),
    question: room.phase === "question" || room.phase === "results" ? currentQuestion(room) : null,
    votesCast: votesCast(room),
    votesNeeded: votesNeeded(room),
    results: room.phase === "results" ? room.lastResults : null,
    leaderboard: room.phase === "gameover" ? finalLeaderboard(room) : null,
  };
}

export function removeEmptyStaleRooms(maxAgeMs = 1000 * 60 * 60 * 6) {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    const noOneConnected =
      !room.hostSocketId && connectedPlayers(room).length === 0;
    if (noOneConnected && now - room.createdAt > maxAgeMs) {
      rooms.delete(code);
    }
  }
}
