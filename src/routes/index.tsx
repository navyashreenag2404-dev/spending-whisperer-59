import { createFileRoute, Link } from "@tanstack/react-router";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, Repeat, TrendingUp, Wallet } from "lucide-react";
import { AppShell, PageHeader, card, btnGhost } from "@/components/AppShell";
import { useApp, inr, monthlyTotals, categoryTotals } from "@/lib/store";
import { recommendations } from "@/lib/engine";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — SpendSmart AI" },
      { name: "description", content: "Your spending at a glance: totals, budget, recurring payments and unusual spend alerts." },
      { property: "og:title", content: "Dashboard — SpendSmart AI" },
      { property: "og:description", content: "AI-powered personal expense analysis dashboard." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { rows, budget, setBudget } = useApp();
  const months = monthlyTotals(rows);
  const last = months[months.length - 1];
  const prev = months[months.length - 2];
  const total = rows.reduce((a, r) => a + Math.abs(r.amount), 0);
  const recurring = [...new Map(rows.filter((r) => r.recurring).map((r) => [r.merchant, r])).values()];
  const recurringTotal = recurring.reduce((a, r) => a + r.amount, 0);
  const unusual = rows.filter((r) => r.unusual);
  const used = last ? Math.min(100, (last.value / budget) * 100) : 0;
  const change = last && prev ? ((last.value - prev.value) / prev.value) * 100 : 0;
  const top = categoryTotals(rows).slice(0, 5);

  const stats = [
    { label: "Total spend", value: inr(total), icon: Wallet, note: `${rows.length} transactions` },
    { label: "This month", value: inr(last?.value ?? 0), icon: TrendingUp, note: prev ? `${change >= 0 ? "+" : ""}${change.toFixed(0)}% vs last month` : "—" },
    { label: "Recurring / month", value: inr(recurringTotal), icon: Repeat, note: `${recurring.length} subscriptions & bills` },
    { label: "Unusual alerts", value: unusual.length, icon: AlertTriangle, note: "Need your attention" },
  ];

  return (
    <AppShell>
      <PageHeader title="Welcome back 👋" subtitle="Here's how your money moved recently." />
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className={card}>
            <div className="flex items-center justify-between text-sm text-muted-foreground">{s.label}<s.icon size={16} /></div>
            <p className="mt-2 font-[var(--font-display)] text-3xl">{s.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.note}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className={`${card} lg:col-span-2`}>
          <h2 className="text-xl">Monthly spending</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <BarChart data={months}>
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v) => `₹${v / 1000}k`} />
                <Tooltip formatter={(v: number) => inr(v)} />
                <Bar dataKey="value" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className={card}>
          <h2 className="text-xl">Monthly budget</h2>
          <p className="mt-1 text-sm text-muted-foreground">{last?.month ?? "—"}: {inr(last?.value ?? 0)} of {inr(budget)}</p>
          <div className="mt-3 h-3 rounded-full bg-muted">
            <div className={`h-3 rounded-full ${used >= 100 ? "bg-destructive" : used > 80 ? "bg-accent" : "bg-primary"}`} style={{ width: `${used}%` }} />
          </div>
          <p className="mt-2 text-sm">{used >= 100 ? "Over budget!" : `${inr(budget - (last?.value ?? 0))} left`}</p>
          <label className="mt-4 block text-xs text-muted-foreground">Change budget</label>
          <input type="range" min={10000} max={150000} step={5000} value={budget} onChange={(e) => setBudget(+e.target.value)} className="w-full accent-[var(--primary)]" />
          <h3 className="mt-5 font-semibold">Top categories</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {top.map((c) => <li key={c.name} className="flex justify-between"><span>{c.name}</span><span className="text-muted-foreground">{inr(c.value)}</span></li>)}
          </ul>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className={card}>
          <div className="flex items-center justify-between"><h2 className="text-xl">Latest alerts</h2><Link to="/alerts" className="text-sm text-primary underline">View all</Link></div>
          <ul className="mt-3 space-y-2 text-sm">
            {unusual.slice(0, 4).map((r) => (
              <li key={r.id} className="rounded-lg bg-warning px-3 py-2"><b>{r.description}</b> · {inr(r.amount)}<br /><span className="text-xs">{r.unusual}</span></li>
            ))}
            {!unusual.length && <li className="text-muted-foreground">No unusual spending 🎉</li>}
          </ul>
        </div>
        <div className={card}>
          <div className="flex items-center justify-between"><h2 className="text-xl">Smart tips</h2><Link to="/assistant" className={btnGhost}>Ask AI</Link></div>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">{recommendations(rows).map((r) => <li key={r}>{r}</li>)}</ul>
        </div>
      </section>
    </AppShell>
  );
}
