import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 items-center px-5 py-8" dir="rtl">
      <div className="mx-auto flex w-full max-w-lg flex-col items-center text-center">
        <div className="relative w-full max-w-xs overflow-hidden rounded-3xl border border-brand-gold/30 bg-white p-2 shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
          <Image
            src="/yoav-logo.png"
            alt="לוגו גדוד יואב — קורס קצינים"
            width={900}
            height={600}
            sizes="(max-width: 640px) 78vw, 320px"
            className="h-auto w-full rounded-2xl object-contain"
            priority
          />
        </div>

        <div className="mt-6">
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">ערב פלוגתי מתחיל כאן</h1>
          <p className="mx-auto mt-2 max-w-sm text-base text-brand-muted">
            מצטרפים לחדר, עונים מהטלפון ורואים את התוצאות יחד על המסך.
          </p>
        </div>

        <div className="mt-7 flex w-full flex-col gap-3">
          <Link
            href="/join"
            className="group flex min-h-16 items-center justify-between rounded-2xl bg-brand-gold px-5 py-4 text-right text-brand-black shadow-[0_10px_28px_rgba(169,120,44,0.25)] transition hover:-translate-y-0.5 hover:bg-brand-gold-light"
          >
            <div>
              <div className="text-xl font-black">הצטרפות למשחק</div>
              <div className="mt-0.5 text-sm opacity-75">יש לי קוד חדר</div>
            </div>
            <span className="text-3xl transition-transform group-hover:-translate-x-1">←</span>
          </Link>

          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/host"
              className="rounded-2xl border border-brand-border bg-white px-4 py-4 text-right shadow-sm transition hover:border-brand-gold/50 hover:shadow-md"
            >
              <span className="text-xl">🖥️</span>
              <div className="mt-2 font-black">פתיחת משחק</div>
              <div className="mt-1 text-xs text-brand-muted">למנחה הערב</div>
            </Link>

            <Link
              href="/captains"
              className="rounded-2xl border border-brand-border bg-white px-4 py-4 text-right shadow-sm transition hover:border-brand-gold/50 hover:shadow-md"
            >
              <span className="text-xl">📝</span>
              <div className="mt-2 font-black">הכנת תוכן</div>
              <div className="mt-1 text-xs text-brand-muted">למפקדי הצוותים</div>
            </Link>
          </div>
        </div>

        <p className="mt-6 text-xs text-brand-muted">גדוד יואב · פלוגה א׳</p>
      </div>
    </main>
  );
}
