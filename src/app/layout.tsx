import type { Metadata, Viewport } from "next";
import Image from "next/image";
import Link from "next/link";
import { Rubik } from "next/font/google";
import "./globals.css";

const rubik = Rubik({
  subsets: ["latin", "hebrew"],
  variable: "--font-rubik",
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "גדוד יואב · פלוגה א׳",
  description: "הפלטפורמה הפלוגתית למשחקים ופעילויות",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#fafafa",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl" className={`${rubik.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-brand-navy text-brand-white">
        <header className="relative w-full border-b border-brand-border bg-white/95 px-4 py-2.5 shadow-sm backdrop-blur">
          <Link
            href="/"
            className="mx-auto flex w-fit items-center justify-center gap-2.5"
            aria-label="גדוד יואב פלוגה א׳ - מסך הבית"
          >
            <Image
              src="/yoav-logo.png"
              alt=""
              width={90}
              height={60}
              className="h-10 w-14 rounded-lg border border-brand-gold/20 bg-white object-contain"
              priority
            />
            <div className="text-right leading-tight">
              <div className="text-sm font-black sm:text-base">גדוד יואב · פלוגה א׳</div>
              <div className="text-[11px] text-brand-muted sm:text-xs">מ״פ אהרוני עמוס</div>
            </div>
          </Link>

          <Link
            href="/admin"
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-brand-muted transition-colors hover:bg-brand-navy-lighter hover:text-brand-white sm:left-5 sm:text-sm"
          >
            ⚙️ ניהול
          </Link>
        </header>
        {children}
      </body>
    </html>
  );
}
