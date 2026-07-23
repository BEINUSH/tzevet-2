import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import {
  createRoom,
  getRoom,
  addPlayer,
  startGame,
  castVote,
  allVoted,
  finishRound,
  nextRound,
  serializeRoom,
  removeEmptyStaleRooms,
} from "./roomManager.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const MAX_PLAYERS = 16;
const MIN_PLAYERS = 3;

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const clientDist = path.join(__dirname, "..", "client", "dist");
app.use(express.static(clientDist));

function broadcastState(room) {
  io.to(room.code).emit("state", serializeRoom(room));
}

function checkAutoReveal(room) {
  if (room.phase === "question" && allVoted(room)) {
    finishRound(room);
    broadcastState(room);
  }
}

io.on("connection", (socket) => {
  socket.on("host:create", (_payload, cb) => {
    const room = createRoom();
    room.hostSocketId = socket.id;
    socket.join(room.code);
    socket.data.role = "host";
    socket.data.code = room.code;
    cb?.({ ok: true, code: room.code, hostToken: room.hostToken, state: serializeRoom(room) });
  });

  socket.on("host:reclaim", ({ code, hostToken } = {}, cb) => {
    const room = getRoom(code);
    if (!room || room.hostToken !== hostToken) {
      cb?.({ ok: false, error: "חדר לא נמצא" });
      return;
    }
    room.hostSocketId = socket.id;
    socket.join(room.code);
    socket.data.role = "host";
    socket.data.code = room.code;
    cb?.({ ok: true, state: serializeRoom(room) });
  });

  socket.on("player:join", ({ code, name } = {}, cb) => {
    const room = getRoom(code);
    if (!room) {
      cb?.({ ok: false, error: "לא נמצא חדר עם הקוד הזה" });
      return;
    }
    if (room.phase !== "lobby") {
      cb?.({ ok: false, error: "המשחק כבר התחיל" });
      return;
    }
    if (!name || !name.trim()) {
      cb?.({ ok: false, error: "צריך להכניס שם" });
      return;
    }
    if (room.players.size >= MAX_PLAYERS) {
      cb?.({ ok: false, error: "החדר מלא (16 שחקנים)" });
      return;
    }
    const player = addPlayer(room, name);
    player.socketId = socket.id;
    socket.join(room.code);
    socket.data.role = "player";
    socket.data.code = room.code;
    socket.data.playerId = player.id;
    cb?.({ ok: true, playerId: player.id, token: player.token, state: serializeRoom(room) });
    broadcastState(room);
  });

  socket.on("player:rejoin", ({ code, playerId, token } = {}, cb) => {
    const room = getRoom(code);
    const player = room?.players.get(playerId);
    if (!room || !player || player.token !== token) {
      cb?.({ ok: false, error: "לא ניתן להתחבר מחדש" });
      return;
    }
    player.connected = true;
    player.socketId = socket.id;
    socket.join(room.code);
    socket.data.role = "player";
    socket.data.code = room.code;
    socket.data.playerId = player.id;
    const youVoted = room.phase === "question" && room.votes.has(player.id);
    cb?.({ ok: true, state: serializeRoom(room), youVoted });
    broadcastState(room);
  });

  socket.on("host:start", ({ code } = {}, cb) => {
    const room = getRoom(code);
    if (!room || room.hostSocketId !== socket.id) {
      cb?.({ ok: false, error: "אין הרשאה" });
      return;
    }
    if (room.players.size < MIN_PLAYERS) {
      cb?.({ ok: false, error: `צריך לפחות ${MIN_PLAYERS} שחקנים כדי להתחיל` });
      return;
    }
    startGame(room);
    cb?.({ ok: true });
    broadcastState(room);
  });

  socket.on("player:vote", ({ code, targetId } = {}, cb) => {
    const room = getRoom(code);
    const playerId = socket.data.playerId;
    if (!room || !playerId) {
      cb?.({ ok: false, error: "אין הרשאה" });
      return;
    }
    const ok = castVote(room, playerId, targetId);
    cb?.({ ok });
    broadcastState(room);
    checkAutoReveal(room);
  });

  socket.on("host:reveal", ({ code } = {}, cb) => {
    const room = getRoom(code);
    if (!room || room.hostSocketId !== socket.id) {
      cb?.({ ok: false, error: "אין הרשאה" });
      return;
    }
    finishRound(room);
    cb?.({ ok: true });
    broadcastState(room);
  });

  socket.on("host:next", ({ code } = {}, cb) => {
    const room = getRoom(code);
    if (!room || room.hostSocketId !== socket.id) {
      cb?.({ ok: false, error: "אין הרשאה" });
      return;
    }
    nextRound(room);
    cb?.({ ok: true });
    broadcastState(room);
  });

  socket.on("disconnect", () => {
    const { role, code, playerId } = socket.data;
    if (!code) return;
    const room = getRoom(code);
    if (!room) return;
    if (role === "host" && room.hostSocketId === socket.id) {
      room.hostSocketId = null;
    } else if (role === "player" && playerId) {
      const player = room.players.get(playerId);
      if (player && player.socketId === socket.id) {
        player.connected = false;
        player.socketId = null;
      }
    }
    broadcastState(room);
  });
});

setInterval(() => removeEmptyStaleRooms(), 1000 * 60 * 30);

app.get(/^(?!\/socket\.io).*/, (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

httpServer.listen(PORT, () => {
  console.log(`מי זה? server running on http://localhost:${PORT}`);
});
