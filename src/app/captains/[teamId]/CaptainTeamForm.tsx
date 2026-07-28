"use client";

import { useEffect, useState, useTransition } from "react";
import { addQuestion, deleteQuestion, getCaptainTeam } from "../actions";

type Question = { id: string; questionText: string; answerText: string | null };

export function CaptainTeamForm({ team }: { team: { id: string; name: string } }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  async function refresh() {
    const data = await getCaptainTeam(team.id);
    if (data) setQuestions(data.submissions);
  }

  useEffect(() => { void refresh(); }, []);

  return (
    <div className="w-full max-w-2xl flex flex-col gap-5">
      <section className="rounded-2xl border border-brand-gold/20 p-5">
        <h2 className="text-xl font-black mb-1">שאלות ותשובות</h2>
        <p className="text-brand-muted text-sm mb-4">עד 15 שאלות על {team.name}. לכל שאלה חובה לצרף תשובה נכונה.</p>
        <input value={question} onChange={e=>setQuestion(e.target.value)} placeholder="השאלה" className="w-full rounded-xl bg-brand-navy-lighter border border-brand-gold/20 px-4 py-3 mb-2" />
        <input value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="התשובה הנכונה" className="w-full rounded-xl bg-brand-navy-lighter border border-brand-gold/20 px-4 py-3 mb-2" />
        <button disabled={pending || questions.length>=15 || !question.trim() || !answer.trim()} onClick={()=>startTransition(async()=>{const r=await addQuestion(team.id,question,answer);if(r.ok){setQuestion("");setAnswer("");setMessage("השאלה נשמרה");await refresh();}else setMessage(r.error||"");})} className="rounded-xl bg-brand-gold text-brand-navy font-bold px-5 py-3">הוסף שאלה ({questions.length}/15)</button>
        <div className="mt-4 flex flex-col gap-2">{questions.map((q,i)=><div key={q.id} className="rounded-xl bg-brand-navy-lighter p-3"><div className="font-bold">{i+1}. {q.questionText}</div><div className="text-brand-muted">תשובה: {q.answerText || "לא הוזנה"}</div><button onClick={()=>startTransition(async()=>{await deleteQuestion(q.id);await refresh();})} className="text-brand-danger text-sm mt-1">מחיקה</button></div>)}</div>
      </section>
      {message && <p className="text-center font-bold">{message}</p>}
    </div>
  );
}
