"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import type { Event, Option, Round } from "@prisma/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ROUND_TYPES, ROUND_TYPE_LABELS, type RoundType } from "@/types/game";
import { createRound, renameEvent, reorderRounds, updateEventDefaults } from "../../actions";
import { RoundCard } from "./RoundCard";
import { CsvImportForm } from "./CsvImportForm";

type RoundWithOptions = Round & { options: Option[] };
type EventWithRounds = Event & { rounds: RoundWithOptions[] };

export function EventEditor({ event }: { event: EventWithRounds }) {
  const router = useRouter();
  const [name, setName] = useState(event.name);
  const [rounds, setRounds] = useState(event.rounds);
  const [allowSelfVoteDefault, setAllowSelfVoteDefault] = useState(event.allowSelfVoteDefault);
  const [soundEnabled, setSoundEnabled] = useState(event.soundEnabled);
  const [, startTransition] = useTransition();
  const [addingType, setAddingType] = useState<RoundType | "">("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setRounds(event.rounds);
  }, [event.rounds]);

  // dnd-kit's useSortable generates ids via useId() that only line up once
  // hydrated on the client - rendering it during SSR causes a (harmless but
  // noisy) hydration mismatch, so the sortable list mounts client-only.
  useEffect(() => {
    setMounted(true);
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = rounds.findIndex((r) => r.id === active.id);
    const newIndex = rounds.findIndex((r) => r.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(rounds, oldIndex, newIndex);
    setRounds(next);
    startTransition(async () => {
      await reorderRounds(
        event.id,
        next.map((r) => r.id)
      );
      router.refresh();
    });
  }

  async function handleAddRound() {
    if (!addingType) return;
    const type = addingType;
    setAddingType("");
    await createRound(event.id, type);
    router.refresh();
  }

  return (
    <main className="flex-1 flex flex-col gap-6 px-4 py-8 max-w-3xl mx-auto w-full">
      <nav className="flex items-center justify-between text-sm">
        <Link href="/admin" className="text-brand-muted hover:text-brand-white">
          ← חזרה לכל האירועים
        </Link>
        <Link href="/" className="text-brand-muted hover:text-brand-white">
          מסך הבית
        </Link>
      </nav>

      <Card className="flex flex-col gap-3">
        <input
          className="text-2xl font-black bg-transparent border-b border-brand-gold/20 focus:outline-none focus:border-brand-gold pb-1"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && name !== event.name && renameEvent(event.id, name)}
        />
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={allowSelfVoteDefault}
              onChange={(e) => {
                setAllowSelfVoteDefault(e.target.checked);
                updateEventDefaults(event.id, e.target.checked, soundEnabled);
              }}
            />
            ברירת מחדל: לאפשר הצבעה עצמית בסבבי &quot;מי הכי&quot;
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(e) => {
                setSoundEnabled(e.target.checked);
                updateEventDefaults(event.id, allowSelfVoteDefault, e.target.checked);
              }}
            />
            אפקטי קול פעילים כברירת מחדל
          </label>
        </div>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="font-bold">עריכה מרוכזת דרך קובץ CSV (נפתח ונערך ב-Excel)</h2>
        <p className="text-brand-muted text-sm">
          הורידו את השאלות הנוכחיות, ערכו ב-Excel (למשל להחליף שמות דמו בשמות אמיתיים, לתקן ניסוחים),
          ואז העלו בחזרה - זה מחליף את כל השאלות באירוע לפי מה שבקובץ.
        </p>
        <div>
          <a
            href={`/admin/events/${event.id}/export`}
            className="inline-block text-sm rounded-lg bg-brand-navy-lighter border border-brand-gold/30 px-4 py-2 text-brand-gold hover:border-brand-gold/60"
          >
            ⬇ הורדת CSV נוכחי
          </a>
        </div>
        <CsvImportForm eventId={event.id} />
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="font-bold">הוספת סבב חדש</h2>
        <div className="flex flex-wrap gap-2">
          <select
            className="rounded-lg bg-brand-navy-lighter px-3 py-2 flex-1 min-w-[200px]"
            value={addingType}
            onChange={(e) => setAddingType(e.target.value as RoundType)}
          >
            <option value="">בחרו סוג סבב...</option>
            {ROUND_TYPES.map((t) => (
              <option key={t} value={t}>
                {ROUND_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          <Button disabled={!addingType} onClick={handleAddRound}>
            + הוספה
          </Button>
        </div>
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="font-bold px-1">
          סדר הסבבים ({rounds.length}) - גררו לשינוי סדר
        </h2>
        {mounted ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={rounds.map((r) => r.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-2">
                {rounds.map((r, i) => (
                  <RoundCard key={r.id} round={r} index={i} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="flex flex-col gap-2">
            {rounds.map((_, i) => (
              <div key={i} className="card-glass rounded-2xl h-16 animate-pulse" />
            ))}
          </div>
        )}
        {rounds.length === 0 && <p className="text-brand-muted text-center">אין עדיין סבבים באירוע הזה</p>}
      </div>
    </main>
  );
}
