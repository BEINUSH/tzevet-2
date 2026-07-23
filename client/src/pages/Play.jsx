import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { socket, emitAsync } from "../socket.js";
import ResultsView from "../components/ResultsView.jsx";

const STORAGE_KEY = "mi-ze-player";

export default function Play() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [state, setState] = useState(null);
  const [error, setError] = useState("");
  const [votedThisRound, setVotedThisRound] = useState(false);
  const [votedFor, setVotedFor] = useState(null);

  const rejoin = useCallback(async (sess) => {
    const res = await emitAsync("player:rejoin", sess);
    if (res?.ok) {
      setState(res.state);
      setVotedThisRound(!!res.youVoted);
    } else {
      setError("החיבור פג. הצטרפו מחדש.");
      sessionStorage.removeItem(STORAGE_KEY);
      setTimeout(() => navigate("/join"), 1500);
    }
  }, [navigate]);

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (!saved) {
      navigate("/join");
      return;
    }
    const sess = JSON.parse(saved);
    setSession(sess);
    rejoin(sess);

    const onState = (s) => {
      setState((prev) => {
        if (prev && prev.roundIndex !== s.roundIndex) {
          setVotedThisRound(false);
          setVotedFor(null);
        }
        return s;
      });
    };
    socket.on("state", onState);
    const onConnect = () => rejoin(sess);
    socket.on("connect", onConnect);
    return () => {
      socket.off("state", onState);
      socket.off("connect", onConnect);
    };
  }, [navigate, rejoin]);

  if (error) {
    return (
      <div className="screen center">
        <p className="error">{error}</p>
      </div>
    );
  }

  if (!state || !session) {
    return (
      <div className="screen center">
        <p className="hint">מתחברים...</p>
      </div>
    );
  }

  async function handleVote(targetId) {
    setVotedFor(targetId);
    setVotedThisRound(true);
    const res = await emitAsync("player:vote", { code: session.code, targetId });
    if (!res?.ok) {
      setVotedThisRound(false);
      setVotedFor(null);
    }
  }

  return (
    <div className="screen center">
      <p className="hint">שלום, {session.name} 👋</p>

      {state.phase === "lobby" && (
        <div className="stack-lg center">
          <div className="pulse-emoji">⏳</div>
          <h2>ממתינים שהמנחה יתחיל את המשחק...</h2>
          <p className="hint">{state.players.length} שחקנים בחדר</p>
        </div>
      )}

      {state.phase === "question" && !votedThisRound && (
        <div className="stack-lg" style={{ width: "100%" }}>
          <p className="hint">
            שאלה {state.roundIndex + 1} מתוך {state.totalRounds}
          </p>
          <h2 className="question-text-lg">{state.question}</h2>
          <div className="vote-grid">
            {state.players.map((p) => (
              <button key={p.id} className="btn btn-vote" onClick={() => handleVote(p.id)}>
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {state.phase === "question" && votedThisRound && (
        <div className="stack-lg center">
          <div className="pulse-emoji">🗳️</div>
          <h2>ההצבעה שלך נשלחה!</h2>
          <p className="hint">
            {votedFor && `הצבעת עבור ${state.players.find((p) => p.id === votedFor)?.name || ""}`}
          </p>
          <p className="hint">
            {state.votesCast} / {state.votesNeeded} הצביעו... ממתינים לשאר החברים
          </p>
        </div>
      )}

      {state.phase === "results" && <ResultsView question={state.question} results={state.results} />}

      {state.phase === "gameover" && (
        <div className="stack-lg center">
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
          <p className="hint">תודה שהשתתפתם! 🎉</p>
        </div>
      )}
    </div>
  );
}
