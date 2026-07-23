export default function ResultsView({ question, results }) {
  if (!results) return null;
  const { tally, winners, maxVotes } = results;
  const scale = Math.max(maxVotes, 1);

  return (
    <div className="results">
      <p className="question-label">השאלה הייתה:</p>
      <h2 className="question-text">{question}</h2>

      {winners.length > 0 && (
        <p className="winner-banner">
          👑 {winners.map((id) => tally.find((t) => t.playerId === id)?.name).join(" ו-")}
        </p>
      )}

      <div className="tally-list">
        {tally.map((t) => {
          const isWinner = winners.includes(t.playerId) && t.votes > 0;
          return (
            <div key={t.playerId} className={`tally-row ${isWinner ? "tally-winner" : ""}`}>
              <div className="tally-name">
                {isWinner ? "👑 " : ""}
                {t.name}
              </div>
              <div className="tally-bar-track">
                <div
                  className="tally-bar-fill"
                  style={{ width: `${(t.votes / scale) * 100}%` }}
                />
              </div>
              <div className="tally-count">{t.votes}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
