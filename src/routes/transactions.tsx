import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Download, Plus, RotateCcw, Trash2, Upload } from "lucide-react";
import { AppShell, PageHeader, card, btn, btnGhost, input } from "@/components/AppShell";
import { useApp, inr } from "@/lib/store";
import { UNCATEGORIZED } from "@/lib/engine";

export const Route = createFileRoute("/transactions")({
  head: () => ({
    meta: [
      { title: "Transactions — SpendSmart AI" },
      { name: "description", content: "Upload, add, review and correct auto-categorized transactions." },
      { property: "og:title", content: "Transactions — SpendSmart AI" },
      { property: "og:description", content: "Review and correct AI expense categories." },
    ],
  }),
  component: Transactions,
});

function Transactions() {
  const { rows, cats, addTxn, deleteTxn, importCSV, correct, resetDemo } = useApp();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), description: "", amount: "" });
  const fileRef = useRef<HTMLInputElement>(null);

  const shown = rows
    .filter((r) => r.description.toLowerCase().includes(q.toLowerCase()) || r.category.toLowerCase().includes(q.toLowerCase()))
    .filter((r) => filter === "all" ? true : filter === "review" ? r.confidence < 0.6 || r.alternatives.length > 0 : filter === "unusual" ? !!r.unusual : filter === "recurring" ? r.recurring : r.category === filter)
    .sort((a, b) => b.date.localeCompare(a.date));

  const onFile = async (f?: File) => {
    if (!f) return;
    const n = importCSV(await f.text());
    setMsg(`Imported ${n} transactions and categorized them automatically.`);
  };

  return (
    <AppShell>
      <PageHeader title="Transactions" subtitle="Every transaction is auto-categorized. Change a category and SpendSmart learns that merchant.">
        <div className="flex flex-wrap gap-2">
          <button className={btn} onClick={() => fileRef.current?.click()}><Upload size={16} />Upload CSV</button>
          <a className={btnGhost} href="/sample-transactions.csv" download><Download size={16} />Sample CSV</a>
          <button className={btnGhost} onClick={() => { resetDemo(); setMsg("Demo data restored."); }}><RotateCcw size={16} />Reset demo</button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        </div>
      </PageHeader>
      {msg && <p className="rounded-lg bg-secondary px-4 py-2 text-sm">{msg}</p>}

      <form className={`${card} flex flex-wrap items-end gap-3`} onSubmit={(e) => {
        e.preventDefault();
        if (!form.description || !+form.amount) return setMsg("Please enter a description and amount.");
        addTxn({ date: form.date, description: form.description, amount: +form.amount });
        setForm({ ...form, description: "", amount: "" });
        setMsg("Transaction added and categorized.");
      }}>
        <div><label className="block text-xs text-muted-foreground">Date</label><input type="date" className={input} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
        <div className="flex-1"><label className="block text-xs text-muted-foreground">Description</label><input className={`${input} w-full`} placeholder="e.g. ZOMATO ORDER 123" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div><label className="block text-xs text-muted-foreground">Amount (₹)</label><input type="number" className={`${input} w-32`} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
        <button className={btn}><Plus size={16} />Add</button>
      </form>

      <section className={card}>
        <div className="flex flex-wrap gap-2">
          <input className={`${input} flex-1`} placeholder="Search description or category…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className={input} value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All</option><option value="review">Needs review</option><option value="unusual">Unusual</option><option value="recurring">Recurring</option>
            {[...cats.map((c) => c.name), UNCATEGORIZED].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{shown.length} shown</p>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr><th className="py-2">Date</th><th>Description</th><th className="text-right">Amount</th><th className="pl-4">Category</th><th>Confidence</th><th>Why</th><th /></tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className={`border-t border-border align-top ${r.unusual ? "bg-warning/50" : ""}`}>
                  <td className="whitespace-nowrap py-2">{r.date}</td>
                  <td>{r.description}
                    {r.recurring && <span className="ml-2 rounded bg-secondary px-1.5 text-xs">recurring</span>}
                    {r.unusual && <span className="ml-2 rounded bg-accent px-1.5 text-xs text-accent-foreground">unusual</span>}
                  </td>
                  <td className="whitespace-nowrap text-right">{inr(r.amount)}</td>
                  <td className="pl-4">
                    <select value={r.category} onChange={(e) => { correct(r.id, r.description, e.target.value); setMsg(`Learned: "${r.merchant}" → ${e.target.value}. Similar transactions updated.`); }}
                      className={`${input} py-1 ${r.category === UNCATEGORIZED ? "border-destructive text-destructive" : ""}`}>
                      {[...cats.map((c) => c.name), UNCATEGORIZED].map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </td>
                  <td>
                    <div className="mt-2 h-1.5 w-16 rounded bg-muted"><div className={`h-1.5 rounded ${r.confidence < 0.6 ? "bg-destructive" : "bg-primary"}`} style={{ width: `${r.confidence * 100}%` }} /></div>
                    <span className="text-xs text-muted-foreground">{Math.round(r.confidence * 100)}% · {r.source}</span>
                  </td>
                  <td className="max-w-xs text-xs text-muted-foreground">{r.reasoning}</td>
                  <td><button aria-label="Delete" className="p-1 text-muted-foreground hover:text-destructive" onClick={() => deleteTxn(r.id)}><Trash2 size={15} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
