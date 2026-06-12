"use client";

import { ReactNode, useEffect } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "accent";

export function Button({
  children,
  variant = "secondary",
  size = "md",
  className = "",
  ...props
}: {
  children: ReactNode;
  variant?: Variant;
  size?: "sm" | "md";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap";
  const sizes = { sm: "px-2.5 py-1.5 text-xs", md: "px-3.5 py-2 text-sm" };
  const variants: Record<Variant, string> = {
    primary: "bg-[var(--fg)] text-[#0a0a0a] hover:bg-white",
    accent: "bg-[var(--accent)] text-[var(--accent-ink)] hover:brightness-110 shadow-[0_0_22px_-8px_var(--accent)]",
    secondary: "border border-[var(--hairline)] bg-white/[0.04] text-[var(--fg)] hover:bg-white/[0.08]",
    ghost: "text-[var(--fg-muted)] hover:bg-white/[0.06] hover:text-[var(--fg)]",
    danger: "border border-rose-500/25 bg-rose-500/5 text-rose-300 hover:bg-rose-500/15",
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function Stat({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "default" | "good" | "bad" | "warn";
}) {
  const tones = {
    default: "text-[var(--fg)]",
    good: "text-emerald-400",
    bad: "text-rose-400",
    warn: "text-amber-400",
  };
  return (
    <div className="card px-3.5 py-3">
      <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--fg-faint)]">{label}</div>
      <div className={`mt-1 text-xl font-semibold tnum ${tones[tone]}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-[var(--fg-muted)]">{sub}</div>}
    </div>
  );
}

export function Badge({
  children,
  tone = "slate",
  className = "",
}: {
  children: ReactNode;
  tone?: "slate" | "green" | "red" | "amber" | "blue" | "teal";
  className?: string;
}) {
  const tones = {
    slate: "bg-white/[0.06] text-[var(--fg-muted)] ring-1 ring-inset ring-[var(--hairline)]",
    green: "bg-emerald-500/12 text-emerald-300 ring-1 ring-inset ring-emerald-500/20",
    red: "bg-rose-500/12 text-rose-300 ring-1 ring-inset ring-rose-500/20",
    amber: "bg-amber-500/12 text-amber-300 ring-1 ring-inset ring-amber-500/20",
    blue: "bg-sky-500/12 text-sky-300 ring-1 ring-inset ring-sky-500/20",
    teal: "bg-cyan-500/12 text-cyan-300 ring-1 ring-inset ring-cyan-500/20",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`my-8 w-full ${wide ? "max-w-3xl" : "max-w-lg"} rounded-2xl border border-[var(--hairline-strong)] bg-[var(--surface)] shadow-2xl shadow-black/50`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--hairline)] px-5 py-3.5">
          <h2 className="text-base font-semibold text-[var(--fg)]">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-[var(--fg-faint)] hover:bg-white/[0.06] hover:text-[var(--fg)]">
            ✕
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-[var(--fg-muted)]">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-[var(--fg-faint)]">{hint}</span>}
    </label>
  );
}

const inputCls =
  "w-full rounded-lg border border-[var(--hairline)] bg-white/[0.03] px-3 py-2 text-sm text-[var(--fg)] placeholder:text-[var(--fg-faint)] focus:border-[var(--accent)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/15";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className || ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputCls} appearance-none ${props.className || ""}`} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputCls} ${props.className || ""}`} />;
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
    </svg>
  );
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string; icon?: ReactNode }[];
  active: string;
  onChange: (k: string) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto scroll-thin border-b border-[var(--hairline)]">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors ${
            active === t.key
              ? "border-[var(--accent)] text-[var(--fg)]"
              : "border-transparent text-[var(--fg-muted)] hover:text-[var(--fg)]"
          }`}
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--hairline-strong)] bg-white/[0.015] px-6 py-12 text-center">
      <p className="text-sm font-medium text-[var(--fg)]">{title}</p>
      {children && <div className="mt-1 text-sm text-[var(--fg-muted)]">{children}</div>}
    </div>
  );
}
