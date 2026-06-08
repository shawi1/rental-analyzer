"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { usdShort } from "@/lib/format";

const AXIS = { fontSize: 11, fill: "#64748b" };
const GRID = "#eef2f6";

const money = (v: unknown) => usdShort(Number(v));
const fmtMoney = (v: unknown) => usdShort(Number(v));
const fmtPct = (v: unknown) => `${Number(v)}%`;

export function SeasonalChart({ data }: { data: { month: string; gross: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="month" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} tickFormatter={money} width={48} />
        <Tooltip formatter={fmtMoney} cursor={{ fill: "#f1f5f9" }} />
        <Bar dataKey="gross" fill="#0f766e" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function BenchmarkChart({ data }: { data: { beds: string; gross: number; adr: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="beds" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} tickFormatter={money} width={48} />
        <Tooltip formatter={(v: unknown, n: unknown) => (n === "gross" ? usdShort(Number(v)) : `$${Number(v)}`)} cursor={{ fill: "#f1f5f9" }} />
        <Bar dataKey="gross" name="Avg gross/yr" fill="#0f766e" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function GuestPie({ data }: { data: { name: string; share: number; color: string }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="share" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={45} paddingAngle={2}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Pie>
        <Tooltip formatter={fmtPct} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function RevenueCompareChart({
  data,
}: {
  data: { name: string; low: number; mid: number; high: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 46)}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid stroke={GRID} horizontal={false} />
        <XAxis type="number" tick={AXIS} axisLine={false} tickLine={false} tickFormatter={money} />
        <YAxis type="category" dataKey="name" tick={AXIS} axisLine={false} tickLine={false} width={130} />
        <Tooltip formatter={fmtMoney} cursor={{ fill: "#f8fafc" }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="low" name="Conservative" fill="#fbbf24" radius={[0, 3, 3, 0]} />
        <Bar dataKey="mid" name="Realistic" fill="#0f766e" radius={[0, 3, 3, 0]} />
        <Bar dataKey="high" name="Optimistic" fill="#10b981" radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function StrVsLtChart({
  data,
}: {
  data: { name: string; strNet: number; ltNet: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 46)}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid stroke={GRID} horizontal={false} />
        <XAxis type="number" tick={AXIS} axisLine={false} tickLine={false} tickFormatter={money} />
        <YAxis type="category" dataKey="name" tick={AXIS} axisLine={false} tickLine={false} width={130} />
        <Tooltip formatter={fmtMoney} cursor={{ fill: "#f8fafc" }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="strNet" name="STR net/yr" fill="#0f766e" radius={[0, 3, 3, 0]} />
        <Bar dataKey="ltNet" name="Long-term cash flow/yr" fill="#6366f1" radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MiniSeasonLine({ data }: { data: { month: string; gross: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={120}>
      <LineChart data={data} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
        <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval={1} />
        <Tooltip formatter={fmtMoney} />
        <Line type="monotone" dataKey="gross" stroke="#0f766e" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
