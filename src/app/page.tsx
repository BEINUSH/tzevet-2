import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ReloadButton } from "@/components/ui/ReloadButton";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-8 px-6 py-10 text-center" dir="rtl">
      <div className="flex flex-col items-center">
        <div className="relative mb-6 w-full max-w-md overflow-hidden rounded-3xl border border-brand-gold/40 bg-white p-2 shadow-[0_18px_55px_rgba(0,0,0,0.45),0_0_30px_rgba(212,175,55,0.14)] sm:p-3">
          <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/70" />
          <Image
            src="/yoav-logo.png"
            alt="לוגו גדוד יואב — קורס קצינים"
            width={900}
            height={600}
            sizes="(max-width: 640px) 88vw, 448px"
            className="h-auto w-full rounded-2xl object-contain"
            priority
          />
        </div>
        <h1 className="text-4xl font-black gold-text">גדוד יואב · פלוגה א׳</h1>
        <p className="text-brand-muted mt-2">מ״פ אהרוני עמוס</p>
        <p className="text-brand-muted mt-1 text-sm">הפלטפורמה הפלוגתית למשחקים ופעילויות</p>
      </div>

      <div className="grid gap-4 w-full max-w-sm">
        <Link href="/host"><Card className="hover:border-brand-gold/60 transition-colors"><div className="text-2xl mb-1">🖥️</div><div className="font-bold text-lg">מסך מנחה</div><p className="text-brand-muted text-sm mt-1">פתיחת חדר ושליטה במהלך הערב</p></Card></Link>
        <Link href="/join"><Card className="hover:border-brand-gold/60 transition-colors"><div className="text-2xl mb-1">📱</div><div className="font-bold text-lg">הצטרפות כמשתתף</div><p className="text-brand-muted text-sm mt-1">סרקו QR או הזינו קוד חדר</p></Card></Link>
        <Link href="/captains"><Card className="hover:border-brand-gold/60 transition-colors"><div className="text-2xl mb-1">📝</div><div className="font-bold text-lg">מפקדי צוותים</div><p className="text-brand-muted text-sm mt-1">קישורים והכנת שאלות לצוותים 1, 2 ו־3</p></Card></Link>
        <Link href="/admin"><Card className="hover:border-brand-gold/60 transition-colors"><div className="text-2xl mb-1">⚙️</div><div className="font-bold text-lg">כניסת מנהל</div><p className="text-brand-muted text-sm mt-1">יצירת אירועים, עריכת שאלות וניהול התוכן</p></Card></Link>
        <a href="https://chatgpt.com/s/t_6a6913c826b081919b8de8bf73fe0a35" target="_blank" rel="noopener noreferrer"><Card className="hover:border-brand-gold/60 transition-colors"><div className="text-2xl mb-1">🤖</div><div className="font-bold text-lg">המשך פיתוח עם ChatGPT</div><p className="text-brand-muted text-sm mt-1">פתיחת שיחת הפיתוח של הפרויקט והמשך שדרוג האפליקציה</p></Card></a>
        <ReloadButton />
      </div>
    </main>
  );
}
