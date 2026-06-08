import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RentalIQ — Rental Property Investment Analyzer",
  description:
    "Analyze short-term (Airbnb/VRBO) and long-term rental investment properties: STR verification, revenue projections, cap rate, and cash-on-cash.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="no-print sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-700 text-sm font-bold text-white">
                R
              </span>
              <span className="text-[15px] font-semibold tracking-tight text-slate-900">
                Rental<span className="text-teal-700">IQ</span>
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link href="/" className="rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100">
                Projects
              </Link>
              <Link href="/settings" className="rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100">
                Settings
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">{children}</main>
        <footer className="no-print border-t border-slate-200 py-4 text-center text-xs text-slate-400">
          RentalIQ · Estimates are modeled projections, not guarantees · Always verify STR status before purchase
        </footer>
      </body>
    </html>
  );
}
