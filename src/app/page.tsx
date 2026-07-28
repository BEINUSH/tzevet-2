import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ReloadButton } from "@/components/ui/ReloadButton";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-8 px-6 py-12 text-center" dir="rtl">
      <div>
        <div className="text-6xl mb-3">🎖️</div>
        <h1 className="text-4xl font-black gold-text">גדוד יואב · פלוגה א׳</h1>
        <p className="text-brand-muted mt-2">מ״פ אהרוני עמוס</p>
        <p className="text-brand-muted mt-1 text-sm">הפלטפורמה הפלוגתית למשחקים ופעילויות</p>
      </div>

      <div className="grid gap-4 w-full max-w-sm">
        <Link href="/host">
          <Card className="hover:border-brand-gold/60 transition-colors">
            <div className="text-2xl mb-1">🖥️</div>
            <div className="font-bold text-lg">מסך מנחה</div>
            <p className="text-brand-muted text-sm mt-1">פתיחת חדר ושליטה במהלך הערב</p>
          </Card>
        </Link>
        <Link href="/join">
          <Card className="hover:border-brand-gold/60 transition-colors">
            <div className="text-2xl mb-1">📱</div>
            <div className="font-bold text-lg">הצטרפות כמשתתף</div>
            <p className="text-brand-muted text-sm mt-1">סרקו QR או הזינו קוד חדר</p>
          </Card>
        </Link>
        <Link href="/captains">
          <Card className="hover:border-brand-gold/60 transition-colors">
            <div className="text-2xl mb-1">📝</div>
            <div className="font-bold text-lg">מפקדי צוותים</div>
            <p className="text-brand-muted text-sm mt-1">קישורים והכנת שאלות לצוותים 1, 2 ו־3</p>
          </Card>
        </Link>
        <Link href="/admin">
          <Card className="hover:border-brand-gold/60 transition-colors">
            <div className="text-2xl mb-1">⚙️</div>
            <div className="font-bold text-lg">כניסת מנהל</div>
            <p className="text-brand-muted text-sm mt-1">יצירת אירועים, עריכת שאלות וניהול התוכן</p>
          </Card>
        </Link>
        <ReloadButton />
      </div>
    </main>
  );
}
