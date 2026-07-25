import Link from "next/link";
import { Card } from "@/components/ui/Card";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-10 px-6 py-12 text-center">
      <div>
        <div className="text-6xl mb-3">🎖️</div>
        <h1 className="text-4xl font-black gold-text">סיירת יואב - צוות בן ססי</h1>
        <p className="text-brand-muted mt-2">אפליקציית המשחקים לערב שלכם</p>
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
        <Link href="/admin">
          <Card className="hover:border-brand-gold/60 transition-colors">
            <div className="text-2xl mb-1">⚙️</div>
            <div className="font-bold text-lg">כניסת מנהל</div>
            <p className="text-brand-muted text-sm mt-1">יצירת אירועים, עריכת שאלות וניהול התוכן</p>
          </Card>
        </Link>
      </div>
    </main>
  );
}
