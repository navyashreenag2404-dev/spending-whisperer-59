import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, HelpCircle, Repeat, Layers } from "lucide-react";
import { AppShell, PageHeader, card } from "@/components/AppShell";
import { useApp, inr } from "@/lib/store";
import { UNCATEGORIZED } from "@/lib/engine";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts & Patterns — SpendSmart AI" },
      { name: "description", content: "Unusual spending, recurring payments and transactions needing review." },
      { property: "og:title", content: "Alerts & Patterns — SpendSmart AI" },
      { property: "og:description", content: "Spot unusual and recurring spending automatically." },
    ],
  }),
  component: Alerts,
});

function Alerts() {
  const { rows } = useApp();
  const unusual = rows.filter((r) => r.unusual);
  const recurring = [...new Map(rows.filter((r) => r.recurring).map((r) => [r.merchant, r])).values()];
  const uncertain = rows.filter((r) => r.category === UNCATEGORIZED);
  const multi = rows.filter((r) => r.alternatives.length > 0 && r.source === "rule");

  return (
    <AppShell>
      <PageHeader title="Alerts & patterns" subtitle="What SpendSmart AI noticed in your spending." />
      <section className={card}>
        <h2 className="flex items-center gap-2 text-xl"><AlertTriangle size={20} />Unusual spending ({unusual.length})</h2>
        <p className="text-sm text-muted-foreground">Flagged when an amount is far above your normal for that category or merchant.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {unusual.map((r) => (
            <div key={r.id} className="rounded-lg border border-border bg-warning p-4">
              <div className="flex justify-between"><b>{r.description}</b><b>{inr(r.amount)}</b></div>
              <p className="text-xs">{r.date} · {r.category}</p>
              <p className="mt-2 text-sm">{r.unusual}</p>
            </div>
          ))}
          {!unusual.length && <p className="text-muted-foreground">Nothing unusual 🎉</p>}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className={card}>
          <h2 className="flex items-center gap-2 text-xl"><Repeat size={20} />Recurring payments</h2>
          <p className="text-sm text-muted-foreground">Same merchant, similar amount, 3+ months in a row.</p>
          <ul className="mt-3 space-y-2 text-sm">
            {recurring.map((r) => (
              <li key={r.merchant} className="flex justify-between rounded-lg bg-secondary px-3 py-2"><span className="capitalize">{r.merchant} <span className="text-xs text-muted-foreground">· {r.category}</span></span><span>{inr(r.amount)}/mo</span></li>
            ))}
          </ul>
          <p className="mt-3 text-sm">Yearly cost: <b>{inr(recurring.reduce((a, r) => a + r.amount, 0) * 12)}</b></p>
        </div>
        <div className="space-y-6">
          <div className={card}>
            <h2 className="flex items-center gap-2 text-xl"><HelpCircle size={20} />Couldn't categorize ({uncertain.length})</h2>
            <ul className="mt-3 space-y-1 text-sm">{uncertain.map((r) => <li key={r.id} className="flex justify-between"><span>{r.description}</span><span>{inr(r.amount)}</span></li>)}</ul>
            <p className="mt-2 text-xs text-muted-foreground">Fix these on the Transactions page — SpendSmart will remember.</p>
          </div>
          <div className={card}>
            <h2 className="flex items-center gap-2 text-xl"><Layers size={20} />Could fit multiple categories ({multi.length})</h2>
            <ul className="mt-3 space-y-2 text-sm">{multi.map((r) => <li key={r.id}><b>{r.description}</b><br /><span className="text-xs text-muted-foreground">{r.reasoning}</span></li>)}</ul>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
