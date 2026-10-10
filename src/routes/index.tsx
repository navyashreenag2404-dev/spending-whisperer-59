import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  analyze, recommendations, parseCSV, DEFAULT_CATEGORIES, UNCATEGORIZED,
  normalizeMerchant, type Category, type Txn,
} from "@/lib/engine";
import { SAMPLE_CSV } from "@/lib/sample";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ledgerly — AI Transaction Categorizer" },
      { name: "description", content: "Upload transactions, auto-categorize with reasoning, detect recurring and unusual spending, and correct in-session." },
      { property: "og:title", content: "Ledgerly — AI Transaction Categorizer" },
      { property: "og:description", content: "Auto-categorize transactions and spot unusual spending patterns." },
    ],
  }),
  component: Index,
});

const card = "rounded-xl border border-border bg-card p-5";
const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

function Index() {
  const [txns, setTxns] = useState<Txn[]>(() => parseCSV(SAMPLE_CSV));
  const [cats, setCats] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [learned, setLearned] = useState<Record<string, string>>({});
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState("all");
  const [newCat, setNewCat] = useState({ name: "", keywords: "" });
  const [form, setForm] = useState({ date: "2026-09-30", description: "", amount: "" });
  const fileRef = useRef<HTMLInputElement>(null);

  const rows = useMemo(() => analyze(txns, cats, learned, overrides), [txns, cats, learned, overrides]);
  const recs = useMemo(() => recommendations(rows), [rows]);
  const total = rows.reduce((a, r) => a + Math.abs(r.amount), 0);
  const byCat = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => m.set(r.category, (m.get(r.category) ?? 0) + Math.abs(r.amount)));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);
  const recurring = [...new Map(rows.filter((r) => r.recurring).map((r) => [r.merchant, r])).values()];
  const unusual = rows.filter((r) => r.unusual);
  const corrections = Object.keys(learned).length;

  const shown = rows.filter((r) =>
    filter === "all" ? true : filter === "review" ? r.confidence < 0.6 || r.alternatives.length > 0 : filter === "unusual" ? !!r.unusual : r.recurring,
  );

  const correct = (id: string, desc: string, category: string) => {
    setOverrides((o) => ({ ...o, [id]: category }));
    setLearned((l) => ({ ...l, [normalizeMerchant(desc)]: category }));
  };

  const onFile = async (f?: File) => {
    if (!f) return;
    setTxns(parseCSV(await f.text()));
    setOverrides({});
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-primary text-primary-foreground">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <p className="text-sm uppercase tracking-widest opacity-80">Ledgerly</p>
          <h1 className="mt-2 text-4xl md:text-5xl">Make sense of every transaction.</h1>
          <p className="mt-3 max-w-2xl opacity-85">Auto-categorization with confidence & reasoning, recurring and unusual spend detection, and a model that learns from your corrections.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={() => fileRef.current?.click()} className="rounded-lg bg-accent px-4 py-2 font-semibold text-accent-foreground">Upload CSV</button>
            <button onClick={() => { setTxns(parseCSV(SAMPLE_CSV)); setOverrides({}); setLearned({}); }} className="rounded-lg border border-primary-foreground/40 px-4 py-2">Load demo data</button>
            <a href="/sample-transactions.csv" download className="rounded-lg border border-primary-foreground/40 px-4 py-2">Download sample CSV</a>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <section className="grid gap-4 md:grid-cols-4">
          {[
            ["Transactions", rows.length],
            ["Total spend", inr(total)],
            ["Unusual flagged", unusual.length],
            ["Corrections learned", corrections],
          ].map(([k, v]) => (
            <div key={k} className={card}>
              <p className="text-sm text-muted-foreground">{k}</p>
              <p className="mt-1 font-[var(--font-display)] text-3xl">{v}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className={card}>
            <h2 className="text-xl">Spend by category</h2>
            <div className="mt-4 space-y-3">
              {byCat.map(([c, v]) => (
                <div key={c}>
                  <div className="flex justify-between text-sm"><span>{c}</span><span className="text-muted-foreground">{inr(v)}</span></div>
                  <div className="mt-1 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${(v / total) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
          <div className={card}>
            <h2 className="text-xl">Recurring payments</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {recurring.map((r) => (
                <li key={r.merchant} className="flex justify-between rounded-lg bg-secondary px-3 py-2"><span className="capitalize">{r.merchant}</span><span>{inr(r.amount)}/mo</span></li>
              ))}
              {!recurring.length && <li className="text-muted-foreground">None detected.</li>}
            </ul>
            <h2 className="mt-6 text-xl">Unusual spending</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {unusual.map((r) => (
                <li key={r.id} className="rounded-lg bg-warning px-3 py-2"><b>{r.description}</b> — {inr(r.amount)}<br /><span className="text-xs">{r.unusual}</span></li>
              ))}
            </ul>
          </div>
          <div className={card}>
            <h2 className="text-xl">Personalized recommendations</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm">{recs.map((r) => <li key={r}>{r}</li>)}</ul>
            <h2 className="mt-6 text-xl">Categories</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {cats.map((c) => (
                <span key={c.name} title={c.keywords.join(", ")} className="rounded-full bg-secondary px-3 py-1 text-xs">
                  {c.name}
                  <button className="ml-2 text-muted-foreground" onClick={() => setCats(cats.filter((x) => x.name !== c.name))}>×</button>
                </span>
              ))}
            </div>
            <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!newCat.name) return; setCats([...cats, { name: newCat.name, keywords: newCat.keywords.split(",").map((k) => k.trim()).filter(Boolean) }]); setNewCat({ name: "", keywords: "" }); }}>
              <input placeholder="Name" value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} className="w-24 rounded-md border border-input bg-background px-2 py-1 text-sm" />
              <input placeholder="keywords, comma" value={newCat.keywords} onChange={(e) => setNewCat({ ...newCat, keywords: e.target.value })} className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm" />
              <button className="rounded-md bg-primary px-3 text-sm text-primary-foreground">Add</button>
            </form>
          </div>
        </section>

        <section className={card}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl">Review transactions</h2>
            <div className="flex gap-2 text-sm">
              {[["all", "All"], ["review", "Needs review"], ["unusual", "Unusual"], ["recurring", "Recurring"]].map(([k, l]) => (
                <button key={k} onClick={() => setFilter(k!)} className={`rounded-full px-3 py-1 ${filter === k ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{l}</button>
              ))}
            </div>
          </div>
          <form className="mt-4 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); if (!form.description) return; setTxns([...txns, { id: `m${Date.now()}`, date: form.date, description: form.description, amount: +form.amount || 0 }]); setForm({ ...form, description: "", amount: "" }); }}>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="rounded-md border border-input bg-background px-2 py-1 text-sm" />
            <input placeholder="Description e.g. ZOMATO ORDER 123" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm" />
            <input placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-28 rounded-md border border-input bg-background px-2 py-1 text-sm" />
            <button className="rounded-md bg-primary px-3 text-sm text-primary-foreground">Add transaction</button>
          </form>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr><th className="py-2">Date</th><th>Description</th><th>Merchant</th><th className="text-right">Amount</th><th className="pl-4">Category</th><th>Confidence</th><th>Reasoning</th></tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id} className={`border-t border-border align-top ${r.unusual ? "bg-warning/50" : ""}`}>
                    <td className="py-2 whitespace-nowrap">{r.date}</td>
                    <td>{r.description}{r.recurring && <span className="ml-2 rounded bg-secondary px-1.5 text-xs">recurring</span>}</td>
                    <td className="capitalize text-muted-foreground">{r.merchant}</td>
                    <td className="text-right whitespace-nowrap">{inr(r.amount)}</td>
                    <td className="pl-4">
                      <select value={r.category} onChange={(e) => correct(r.id, r.description, e.target.value)} className={`rounded-md border px-2 py-1 ${r.category === UNCATEGORIZED ? "border-destructive text-destructive" : "border-input"} bg-background`}>
                        {[...cats.map((c) => c.name), UNCATEGORIZED].map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </td>
                    <td>
                      <div className="h-1.5 w-16 rounded bg-muted"><div className={`h-1.5 rounded ${r.confidence < 0.6 ? "bg-destructive" : "bg-primary"}`} style={{ width: `${r.confidence * 100}%` }} /></div>
                      <span className="text-xs text-muted-foreground">{Math.round(r.confidence * 100)}% · {r.source}</span>
                    </td>
                    <td className="max-w-xs text-xs text-muted-foreground">{r.reasoning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
