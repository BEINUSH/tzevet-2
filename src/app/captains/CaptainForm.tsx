"use client";

import { useState, useTransition } from "react";
import { addCompanyPoll, addMember, addQuestion, deleteMember, deleteQuestion, getCaptainTeam } from "./actions";

type Team = { id: string; name: string };
type Member = { id: string; name: string; isCommander: boolean };
type Question = { id: string; questionText: string; answerText: string | null };

export function CaptainForm({ teams }: { teams: Team[] }) {
  const [teamId, setTeamId] = useState("");
  const [teamName, setTeamName] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [memberName, setMemberName] = useState("");
  const [commander, setCommander] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  async function refresh(id = teamId) {
    if (!id) return;
    const team = await getCaptainTeam(id);
    if (!team) return;
    setTeamName(team.name);
    setMembers(team.members);
    setQuestions(team.submissions);
  }

  function chooseTeam(id: string) {
    setTeamId(id); setMessage(""); setMembers([]); setQuestions([]);
    if (id) startTransition(() => refresh(id));
  }

  return <div className="w-full max-w-2xl flex flex-col gap-5">
    <div className="rounded-2xl border border-brand-gold/20 p-5">
      <label className="font-bold block mb-2">בחר את הצוות שלך</label>
      <select value={teamId} onChange={(e) => chooseTeam(e.target.value)} className="w-full rounded-xl bg-brand-navy-lighter border border-brand-gold/20 px-4 py-3">
        <option value="">בחירת צוות</option>
        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
    </div>

    {teamId && <>
      <section className="rounded-2xl border border-brand-gold/20 p-5">
        <h2 className="text-xl font-black mb-1">1. אנשי {teamName}</h2>
        <p className="text-brand-muted text-sm mb-4">הכנס את כל הצוערים בצוות, כולל את עצמך כמפקד הצוות.</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input value={memberName} onChange={e => setMemberName(e.target.value)} placeholder="שם מלא" className="flex-1 rounded-xl bg-brand-navy-lighter border border-brand-gold/20 px-4 py-3" />
          <label className="flex items-center gap-2 px-2"><input type="checkbox" checked={commander} onChange={e => setCommander(e.target.checked)} /> מפק״צ</label>
          <button disabled={pending || !memberName.trim()} onClick={() => startTransition(async () => { const r=await addMember(teamId, memberName, commander); if(r.ok){setMemberName("");setCommander(false);await refresh();} else setMessage(r.error||""); })} className="rounded-xl bg-brand-gold text-brand-navy font-bold px-5 py-3">הוסף</button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">{members.map(m => <span key={m.id} className="rounded-full border border-brand-gold/20 px-3 py-2 text-sm">{m.isCommander ? "מפק״צ · " : ""}{m.name} <button onClick={() => startTransition(async()=>{await deleteMember(m.id);await refresh();})} className="mr-2 text-brand-danger">×</button></span>)}</div>
      </section>

      <section className="rounded-2xl border border-brand-gold/20 p-5">
        <h2 className="text-xl font-black mb-1">2. שאלות ותשובות</h2>
        <p className="text-brand-muted text-sm mb-4">עד 15 שאלות על הצוות. לכל שאלה חובה לצרף את התשובה הנכונה.</p>
        <input value={question} onChange={e=>setQuestion(e.target.value)} placeholder="השאלה" className="w-full rounded-xl bg-brand-navy-lighter border border-brand-gold/20 px-4 py-3 mb-2" />
        <input value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="התשובה הנכונה" className="w-full rounded-xl bg-brand-navy-lighter border border-brand-gold/20 px-4 py-3 mb-2" />
        <button disabled={pending || questions.length>=15} onClick={()=>startTransition(async()=>{const r=await addQuestion(teamId,question,answer);if(r.ok){setQuestion("");setAnswer("");await refresh();}else setMessage(r.error||"");})} className="rounded-xl bg-brand-gold text-brand-navy font-bold px-5 py-3">הוסף שאלה ({questions.length}/15)</button>
        <div className="mt-4 flex flex-col gap-2">{questions.map((q,i)=><div key={q.id} className="rounded-xl bg-brand-navy-lighter p-3"><div className="font-bold">{i+1}. {q.questionText}</div><div className="text-brand-muted">תשובה: {q.answerText || "לא הוזנה"}</div><button onClick={()=>startTransition(async()=>{await deleteQuestion(q.id);await refresh();})} className="text-brand-danger text-sm mt-1">מחיקה</button></div>)}</div>
      </section>

      <section className="rounded-2xl border border-brand-gold/20 p-5">
        <h2 className="text-xl font-black mb-1">3. רעיון לסקר פלוגתי</h2>
        <p className="text-brand-muted text-sm mb-4">סקר שמיועד לכל פלוגה א׳ — צוותים 1, 2 ו־3.</p>
        <input value={pollQuestion} onChange={e=>setPollQuestion(e.target.value)} placeholder="שאלת הסקר" className="w-full rounded-xl bg-brand-navy-lighter border border-brand-gold/20 px-4 py-3 mb-2" />
        <textarea value={pollOptions} onChange={e=>setPollOptions(e.target.value)} placeholder={'אפשרויות — כל אפשרות בשורה חדשה\nאפשרות 1\nאפשרות 2'} className="w-full min-h-28 rounded-xl bg-brand-navy-lighter border border-brand-gold/20 px-4 py-3 mb-2" />
        <button disabled={pending} onClick={()=>startTransition(async()=>{const r=await addCompanyPoll(teamName,pollQuestion,pollOptions.split("\n"));if(r.ok){setPollQuestion("");setPollOptions("");setMessage("הסקר נשמר בהצלחה");}else setMessage(r.error||"");})} className="rounded-xl bg-brand-gold text-brand-navy font-bold px-5 py-3">שמור סקר</button>
      </section>
    </>}
    {message && <p className="text-center font-bold">{message}</p>}
  </div>;
}
