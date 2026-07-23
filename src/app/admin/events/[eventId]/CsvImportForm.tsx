"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { importRoundsFromCsv } from "../../actions";

export function CsvImportForm({ eventId }: { eventId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setErrors([]);
    setSuccess(null);
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      const res = await importRoundsFromCsv(eventId, formData);
      if (res.ok) {
        setSuccess(`יובאו ${res.importedCount} שאלות בהצלחה - זה מחליף את כל השאלות הקודמות באירוע.`);
        if (fileRef.current) fileRef.current.value = "";
        router.refresh();
      } else {
        setErrors(res.errors);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="text-sm flex-1 min-w-[200px]"
        />
        <Button type="submit" size="sm" variant="secondary" disabled={pending}>
          {pending ? "מייבא..." : "העלאת CSV מעודכן"}
        </Button>
      </div>
      {success && <p className="text-brand-success text-sm">{success}</p>}
      {errors.length > 0 && (
        <div className="text-brand-danger text-sm flex flex-col gap-1">
          <p className="font-bold">הייבוא נכשל - לא נעשה שום שינוי:</p>
          {errors.map((e, i) => (
            <p key={i}>{e}</p>
          ))}
        </div>
      )}
    </form>
  );
}
