"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Settings, Sparkles } from "lucide-react";

const NAV = [
  { href: "/", label: "Projects", icon: LayoutGrid },
  { href: "/settings", label: "Settings", icon: Settings },
];

function Brand() {
  return (
    <Link href="/" className="group flex items-center gap-2.5">
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-[var(--accent)] text-[13px] font-bold text-[var(--accent-ink)] shadow-[0_0_20px_-4px_var(--accent)]">
        IQ
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-[var(--fg)]">
        Rental<span className="font-display italic text-[var(--accent)]">IQ</span>
      </span>
    </Link>
  );
}

function NavLinks({ pathname }: { pathname: string }) {
  return (
    <>
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" || pathname.startsWith("/project") : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
              active
                ? "bg-white/[0.06] text-[var(--fg)] shadow-[inset_0_0_0_1px_var(--hairline)]"
                : "text-[var(--fg-muted)] hover:bg-white/[0.04] hover:text-[var(--fg)]"
            }`}
          >
            <Icon size={16} className={active ? "text-[var(--accent)]" : ""} />
            {label}
          </Link>
        );
      })}
    </>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  return (
    <>
      {/* Desktop rail */}
      <aside className="no-print sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-[var(--hairline)] bg-[var(--bg-2)]/70 px-4 py-5 backdrop-blur md:flex">
        <Brand />
        <nav className="mt-8 flex flex-col gap-1">
          <NavLinks pathname={pathname} />
        </nav>
        <div className="mt-auto rounded-xl border border-[var(--hairline)] bg-white/[0.02] p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--accent)]">
            <Sparkles size={12} /> Owned data engine
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-[var(--fg-faint)]">
            MLS + free public data + ML forecasting. Your own API, no per-call limits.
          </p>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="no-print sticky top-0 z-40 flex items-center justify-between border-b border-[var(--hairline)] bg-[var(--bg-2)]/80 px-4 py-3 backdrop-blur md:hidden">
        <Brand />
        <nav className="flex items-center gap-1">
          <NavLinks pathname={pathname} />
        </nav>
      </header>
    </>
  );
}
