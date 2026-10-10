import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Line, LineChart, XAxis, YAxis } from "recharts";
import { AppShell, PageHeader, card, btn, input, CHART_COLORS } from "@/components/AppShell";
import { useApp, inr, categoryTotals } from "@/lib/store";

export const Route = createFileRoute("/analysis")({
  head: () => ({
    meta: [
      { title: "Spending Analysis — SpendSmart AI" },
      { name: "description", content: "Category breakdown, monthly trends and configurable expense categories." },
      { property: "og:title", content: "Spending Analysis — SpendSmart AI" },
      { property: "og:description", content: "See where your money goes by category and month." },
    ],
  }),
  component: Analysis,
});

function Analysis() {
  const { rows, cats, addCategory, removeCategory } = useApp();
  const [nc, setNc] = useState({ name: "", keywords: "" });
  const totals = categoryTotals(rows);
  const total = totals.reduce((a, c) => a + c.value, 0) || 1;

  // Category × month trend for the top 4 categories
  const months = [...new Set(rows.map((r) => r.date.slice(0, 7)))].sort();
  const topNames = totals.slice(0, 4).map((t) => t.name);
  const trend = months.map((m) => {
    const o: Record<string, string | number> = { month: m };
    topNames.forEach((n) => { o[n] = rows.filter((r) => r.category === n && r.date.startsWith(m)).reduce((a, r) => a + r.amount, 0); });
    return o;
  });

  // Merchants
  const merchants = new Map<string, { n: number; v: number }>();
  rows.forEach((r) => { const x = merchants.get(r.merchant) ?? { n: 0, v: 0 }; merchants.set(r.merchant, { n: x.n + 1, v: x.v + r.amount }); });
  const topMerchants = [...merchants.entries()].sort((a, b) => b[1].v - a[1].v).slice(0, 8);

  return (
    <AppShell>
      <PageHeader title="Spending analysis" subtitle="Where your money goes, and how it changes over time." />
      <section className="grid gap-6 lg:grid-cols-2">
        <div className={card}>
          <h2 className="text-xl">By category</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={totals} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
                  {totals.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => inr(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="space-y-2 text-sm">
            {totals.map((c, i) => (
              <li key={c.name} className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                <span className="flex-1">{c.name}</span><span className="text-muted-foreground">{Math.round((c.value / total) * 100)}%</span><span className="w-24 text-right">{inr(c.value)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-6">
          <div className={card}>
            <h2 className="text-xl">Top category trends</h2>
            <div className="mt-2 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <XAxis dataKey="month" fontSize={12} stroke="var(--muted-foreground)" />
                  <YAxis fontSize={12} stroke="var(--muted-foreground)" tickFormatter={(v) => `₹${v / 1000}k`} />
                  <Tooltip formatter={(v: number) => inr(v)} />
                  {topNames.map((n, i) => <Line key={n} dataKey={n} stroke={CHART_COLORS[i]} strokeWidth={2} />)}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className={card}>
            <h2 className="text-xl">Top merchants</h2>
            <p className="text-xs text-muted-foreground">Different descriptions of the same merchant are grouped together.</p>
            <ul className="mt-3 space-y-1 text-sm">
              {topMerchants.map(([m, x]) => <li key={m} className="flex justify-between capitalize"><span>{m} <span className="text-xs text-muted-foreground">×{x.n}</span></span><span>{inr(x.v)}</span></li>)}
            </ul>
          </div>
        </div>
      </section>

      <section className={card}>
        <h2 className="text-xl">Your categories</h2>
        <p className="text-sm text-muted-foreground">Add your own category with keywords — transactions are re-categorized instantly.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {cats.map((c) => (
            <span key={c.name} title={c.keywords.join(", ")} className="rounded-full bg-secondary px-3 py-1 text-sm">
              {c.name}<button className="ml-2 text-muted-foreground hover:text-destructive" onClick={() => removeCategory(c.name)}>×</button>
            </span>
          ))}
        </div>
        <form className="mt-4 flex flex-wrap gap-2" onSubmit={(e) => {
          e.preventDefault();
          if (!nc.name.trim()) return;
          addCategory({ name: nc.name.trim(), keywords: nc.keywords.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean) });
          setNc({ name: "", keywords: "" });
        }}>
          <input className={input} placeholder="Category name, e.g. Family" value={nc.name} onChange={(e) => setNc({ ...nc, name: e.target.value })} />
          <input className={`${input} flex-1`} placeholder="Keywords, comma separated, e.g. ramesh, mom" value={nc.keywords} onChange={(e) => setNc({ ...nc, keywords: e.target.value })} />
          <button className={btn}>Add category</button>
        </form>
      </section>
    </AppShell>
  );
}
