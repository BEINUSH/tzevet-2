export default function PlayerList({ players }) {
  if (!players.length) {
    return <p className="hint">ממתינים לשחקנים ראשונים...</p>;
  }
  return (
    <div className="player-grid">
      {players.map((p) => (
        <div key={p.id} className={`player-chip ${p.connected ? "" : "disconnected"}`}>
          <span className="player-dot" />
          {p.name}
        </div>
      ))}
    </div>
  );
}
