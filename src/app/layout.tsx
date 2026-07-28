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
        <header className="w-full border-b border-brand-gold/10 bg-brand-navy/95 px-4 py-2">
          <Link href="/" className="mx-auto flex max-w-5xl items-center justify-center gap-3" aria-label="גדוד יואב פלוגה א׳ - מסך הבית">
            <Image src="/yoav-logo.png" alt="לוגו גדוד יואב" width={180} height={58} className="h-12 w-auto rounded-sm bg-white object-contain px-2" priority />
            <div className="text-right leading-tight">
              <div className="font-black">גדוד יואב · פלוגה א׳</div>
              <div className="text-xs text-brand-muted">מ״פ אהרוני עמוס</div>
            </div>
          </Link>
        </header>
        {children}
      </body>
    </html>
  );
}
