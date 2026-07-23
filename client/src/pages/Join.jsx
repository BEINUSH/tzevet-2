import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { emitAsync } from "../socket.js";

const STORAGE_KEY = "mi-ze-player";

export default function Join() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [code, setCode] = useState((params.get("code") || "").toUpperCase());
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;
    setLoading(true);
    setError("");
    const res = await emitAsync("player:join", { code: code.trim().toUpperCase(), name: name.trim() });
    setLoading(false);
    if (res?.ok) {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ code: code.trim().toUpperCase(), playerId: res.playerId, token: res.token, name: name.trim() })
      );
      navigate("/play");
    } else {
      setError(res?.error || "משהו השתבש, נסו שוב");
    }
  }

  return (
    <div className="screen center">
      <h1>הצטרפות למשחק</h1>
      <form className="stack" onSubmit={handleSubmit}>
        <input
          className="input code-input"
          placeholder="קוד חדר"
          value={code}
          maxLength={4}
          autoCapitalize="characters"
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />
        <input
          className="input"
          placeholder="השם שלך"
          value={name}
          maxLength={20}
          onChange={(e) => setName(e.target.value)}
        />
        {error && <p className="error">{error}</p>}
        <button className="btn btn-primary btn-lg" type="submit" disabled={loading}>
          {loading ? "מצטרפים..." : "הצטרפות"}
        </button>
      </form>
    </div>
  );
}
