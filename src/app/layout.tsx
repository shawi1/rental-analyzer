import type { Metadata } from "next";
import { Inter, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const instrument = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-instrument" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: "RentalIQ — Rental Property Intelligence",
  description:
    "Short-term (Airbnb/VRBO) and long-term rental investment analysis: STR verification, revenue projections, forecasts, Monte Carlo returns, and deal scoring.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${instrument.variable} ${jetbrains.variable} h-full`}>
      <body className="relative min-h-full">
        <div className="relative z-10 flex min-h-screen">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-7 sm:px-8">{children}</main>
            <footer className="no-print px-6 py-5 text-center text-[11px] text-[var(--fg-faint)]">
              RentalIQ · Modeled projections, not guarantees · Always verify STR allowance &amp; comps before advising
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}
