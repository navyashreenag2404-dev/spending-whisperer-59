// Simple shared app state. Saved in the browser so data survives refreshes.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { analyze, normalizeMerchant, parseCSV, DEFAULT_CATEGORIES, type Category, type Classified, type Txn } from "./engine";
import { SAMPLE_CSV } from "./sample";

type State = { txns: Txn[]; cats: Category[]; learned: Record<string, string>; overrides: Record<string, string>; budget: number };

const initial = (): State => ({ txns: parseCSV(SAMPLE_CSV), cats: DEFAULT_CATEGORIES, learned: {}, overrides: {}, budget: 40000 });
const KEY = "spendsmart-v1";

type Ctx = State & {
  rows: Classified[];
  addTxn: (t: Omit<Txn, "id">) => void;
  deleteTxn: (id: string) => void;
  importCSV: (text: string) => number;
  correct: (id: string, desc: string, category: string) => void;
  addCategory: (c: Category) => void;
  removeCategory: (name: string) => void;
  setBudget: (n: number) => void;
  resetDemo: () => void;
};

const AppCtx = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<State>(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setS({ ...initial(), ...JSON.parse(raw) });
    } catch { /* ignore broken saved data */ }
    setLoaded(true);
  }, []);
  useEffect(() => { if (loaded) localStorage.setItem(KEY, JSON.stringify(s)); }, [s, loaded]);

  const rows = useMemo(() => analyze(s.txns, s.cats, s.learned, s.overrides), [s]);

  const value: Ctx = {
    ...s,
    rows,
    addTxn: (t) => setS((p) => ({ ...p, txns: [{ ...t, id: `m${Date.now()}` }, ...p.txns] })),
    deleteTxn: (id) => setS((p) => ({ ...p, txns: p.txns.filter((t) => t.id !== id) })),
    importCSV: (text) => {
      const t = parseCSV(text);
      setS((p) => ({ ...p, txns: [...t, ...p.txns] }));
      return t.length;
    },
    correct: (id, desc, category) =>
      setS((p) => ({ ...p, overrides: { ...p.overrides, [id]: category }, learned: { ...p.learned, [normalizeMerchant(desc)]: category } })),
    addCategory: (c) => setS((p) => ({ ...p, cats: [...p.cats, c] })),
    removeCategory: (name) => setS((p) => ({ ...p, cats: p.cats.filter((c) => c.name !== name) })),
    setBudget: (budget) => setS((p) => ({ ...p, budget })),
    resetDemo: () => setS(initial()),
  };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp must be inside AppProvider");
  return c;
}

export const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

/** Totals per category, sorted high→low. */
export function categoryTotals(rows: Classified[]) {
  const m = new Map<string, number>();
  rows.forEach((r) => m.set(r.category, (m.get(r.category) ?? 0) + Math.abs(r.amount)));
  return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

/** Totals per month (YYYY-MM). */
export function monthlyTotals(rows: Classified[]) {
  const m = new Map<string, number>();
  rows.forEach((r) => m.set(r.date.slice(0, 7), (m.get(r.date.slice(0, 7)) ?? 0) + Math.abs(r.amount)));
  return [...m.entries()].sort().map(([month, value]) => ({ month, value }));
}

/** Text summary sent to the AI assistant. */
export function buildSummary(rows: Classified[], budget: number) {
  const total = rows.reduce((a, r) => a + Math.abs(r.amount), 0);
  const cats = categoryTotals(rows).map((c) => `${c.name}: ${inr(c.value)}`).join(", ");
  const months = monthlyTotals(rows).map((m) => `${m.month}: ${inr(m.value)}`).join(", ");
  const rec = [...new Set(rows.filter((r) => r.recurring).map((r) => `${r.merchant} (${inr(r.amount)})`))].join(", ");
  const unusual = rows.filter((r) => r.unusual).map((r) => `${r.date} ${r.description} ${inr(r.amount)}`).join("; ");
  const top = [...rows].sort((a, b) => b.amount - a.amount).slice(0, 8).map((r) => `${r.description} ${inr(r.amount)}`).join("; ");
  return `Transactions: ${rows.length}. Total spend: ${inr(total)}. Monthly budget: ${inr(budget)}.
By category: ${cats}.
By month: ${months}.
Recurring: ${rec || "none"}.
Unusual: ${unusual || "none"}.
Largest: ${top}.`;
}
