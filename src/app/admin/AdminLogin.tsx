"use client";

import { FormEvent, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { loginAdmin } from "./auth-actions";

export function AdminLogin() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await loginAdmin(code);
      if (!result.ok) {
        setError("הקוד שגוי. נסו שוב.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
      <Card className="w-full max-w-sm flex flex-col gap-5 text-center">
        <div>
          <div className="text-5xl mb-3">🔐</div>
          <h1 className="text-3xl font-black gold-text">כניסת מנהל</h1>
          <p className="text-brand-muted mt-2">הזינו את קוד המנהל כדי לערוך את התוכן</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={4}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
            placeholder="קוד בן 4 ספרות"
            aria-label="קוד מנהל"
            className="rounded-xl bg-brand-navy-lighter border border-brand-gold/20 px-4 py-3 text-center text-2xl tracking-[0.4em]"
            autoFocus
          />
          {error && <p className="text-brand-danger text-sm" role="alert">{error}</p>}
          <Button type="submit" disabled={pending || code.length !== 4}>
            {pending ? "בודק..." : "כניסה"}
          </Button>
        </form>
        <Link href="/" className="text-brand-muted hover:text-brand-white text-sm">
          ← חזרה למסך הבית
        </Link>
      </Card>
    </main>
  );
}
