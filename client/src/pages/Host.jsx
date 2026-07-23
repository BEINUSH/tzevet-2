import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { socket, emitAsync } from "../socket.js";
import QRCodeImage from "../components/QRCode.jsx";
import PlayerList from "../components/PlayerList.jsx";
import ResultsView from "../components/ResultsView.jsx";

const STORAGE_KEY = "mi-ze-host";

export default function Host() {
  const navigate = useNavigate();
  const [state, setState] = useState(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

  const setupRoom = useCallback(async () => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      const { code, hostToken } = JSON.parse(saved);
      const res = await emitAsync("host:reclaim", { code, hostToken });
      if (res?.ok) {
        setState(res.state);
        return;
      }
      sessionStorage.removeItem(STORAGE_KEY);
    }
    const res = await emitAsync("host:create", {});
    if (res?.ok) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ code: res.code, hostToken: res.hostToken }));
      setState(res.state);
    } else {
      setError("לא הצלחנו לפתוח חדר. נסו לרענן.");
    }
  }, []);

  useEffect(() => {
    setupRoom();
    const onState = (s) => setState((prev) => (prev && prev.code !== s.code ? prev : s));
    socket.on("state", onState);
    socket.on("connect", setupRoom);
    return () => {
      socket.off("state", onState);
      socket.off("connect", setupRoom);
    };
  }, [setupRoom]);

  if (error) {
    return (
      <div className="screen center">
        <p className="error">{error}</p>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="screen center">
        <p className="hint">פותח חדר...</p>
      </div>
    );
  }

  const joinUrl = `${window.location.origin}/join?code=${state.code}`;

  async function handleStart() {
    setStarting(true);
    const res = await emitAsync("host:start", { code: state.code });
    setStarting(false);
    if (!res?.ok) setError(res?.error || "שגיאה בהתחלת המשחק");
  }

  async function handleReveal() {
    await emitAsync("host:reveal", { code: state.code });
  }

  async function handleNext() {
    await emitAsync("host:next", { code: state.code });
  }

  function handleNewGame() {
    sessionStorage.removeItem(STORAGE_KEY);
    navigate("/");
  }

  return (
    <div className="screen">
      {state.phase === "lobby" && (
        <div className="center stack-lg">
          <p className="hint">קוד הצטרפות</p>
          <div className="room-code">{state.code}</div>
          <QRCodeImage value={joinUrl} size={220} />
          <p className="hint">סרקו את הקוד או היכנסו ל-{joinUrl}</p>

          <div className="divider" />
          <p className="hint">
            שחקנים ({state.players.length}/16)
          </p>
          <PlayerList players={state.players} />

          {error && <p className="error">{error}</p>}
          <button
            className="btn btn-primary btn-lg"
            disabled={state.players.length < 3 || starting}
            onClick={handleStart}
          >
            {state.players.length < 3 ? "צריך לפחות 3 שחקנים" : "🚀 התחל משחק"}
          </button>
        </div>
      )}

      {state.phase === "question" && (
        <div className="center stack-lg">
          <p className="hint">
            שאלה {state.roundIndex + 1} מתוך {state.totalRounds}
          </p>
          <h2 className="question-text-lg">{state.question}</h2>
          <p className="vote-progress">
            {state.votesCast} / {state.votesNeeded} הצביעו
          </p>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${state.votesNeeded ? (state.votesCast / state.votesNeeded) * 100 : 0}%` }}
            />
          </div>
          <button className="btn btn-secondary" onClick={handleReveal}>
            גלו תוצאות עכשיו
          </button>
        </div>
      )}

      {state.phase === "results" && (
        <div className="center stack-lg">
          <ResultsView question={state.question} results={state.results} />
          <button className="btn btn-primary btn-lg" onClick={handleNext}>
            {state.roundIndex + 1 >= state.totalRounds ? "🏁 לסיכום הסופי" : "לשאלה הבאה ⏭"}
          </button>
        </div>
      )}

      {state.phase === "gameover" && (
        <div className="center stack-lg">
          <h2>🏆 סיכום הערב</h2>
          <div className="leaderboard">
            {state.leaderboard.map((p, i) => (
              <div key={p.id} className={`leaderboard-row ${i === 0 && p.crowns > 0 ? "leaderboard-first" : ""}`}>
                <span className="leaderboard-rank">{i + 1}</span>
                <span className="leaderboard-name">{p.name}</span>
                <span className="leaderboard-crowns">{"👑".repeat(Math.min(p.crowns, 5)) || "—"}</span>
              </div>
            ))}
          </div>
          <button className="btn btn-secondary" onClick={handleNewGame}>
            חדר חדש
          </button>
        </div>
      )}
    </div>
  );
}
