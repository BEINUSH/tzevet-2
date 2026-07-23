import { useNavigate, useSearchParams } from "react-router-dom";

export default function Landing() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const code = params.get("code");

  return (
    <div className="screen center">
      <div className="logo">
        <span className="logo-emoji">🎯</span>
        <h1>מי זה?</h1>
        <p className="subtitle">משחק המולטיפלייר לערב הגיבוש</p>
      </div>

      <div className="stack">
        <button className="btn btn-primary btn-lg" onClick={() => navigate("/host")}>
          פתיחת חדר (מנחה)
        </button>
        <button
          className="btn btn-secondary btn-lg"
          onClick={() => navigate(code ? `/join?code=${code}` : "/join")}
        >
          הצטרפות למשחק
        </button>
      </div>

      <p className="hint">כולם מצביעים מהטלפון, בלי שום התקנה 📱</p>
    </div>
  );
}
