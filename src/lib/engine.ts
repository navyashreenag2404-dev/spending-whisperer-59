export type Txn = {
  id: string;
  date: string;
  description: string;
  amount: number;
};

export type Category = { name: string; keywords: string[] };

export type Classified = Txn & {
  merchant: string;
  category: string;
  confidence: number;
  reasoning: string;
  alternatives: { category: string; score: number }[];
  source: "rule" | "learned" | "user" | "unknown";
  recurring: boolean;
  unusual: string | null;
};

export const UNCATEGORIZED = "Uncategorized";

export const DEFAULT_CATEGORIES: Category[] = [
  { name: "Groceries", keywords: ["grocery", "bigbasket", "dmart", "reliance fresh", "walmart", "whole foods", "supermarket", "blinkit", "zepto"] },
  { name: "Dining", keywords: ["swiggy", "zomato", "restaurant", "cafe", "starbucks", "dominos", "pizza", "mcdonald", "kfc", "burger"] },
  { name: "Transport", keywords: ["uber", "ola", "rapido", "metro", "fuel", "petrol", "shell", "indian oil", "parking", "irctc"] },
  { name: "Shopping", keywords: ["amazon", "amzn", "flipkart", "myntra", "ajio", "mall", "store"] },
  { name: "Entertainment", keywords: ["netflix", "spotify", "prime video", "hotstar", "bookmyshow", "pvr", "youtube premium", "steam"] },
  { name: "Utilities", keywords: ["electricity", "bescom", "water bill", "airtel", "jio", "broadband", "gas bill", "vodafone"] },
  { name: "Rent", keywords: ["rent", "landlord", "lease"] },
  { name: "Health", keywords: ["pharmacy", "apollo", "medplus", "hospital", "clinic", "gym", "cult.fit", "1mg"] },
  { name: "Travel", keywords: ["makemytrip", "indigo", "air india", "hotel", "airbnb", "goibibo", "oyo"] },
  { name: "Education", keywords: ["udemy", "coursera", "school", "college", "tuition", "books"] },
];

const NOISE = /\b(pos|upi|ach|debit|credit|card|txn|ref|payment|purchase|online|ind|in|pvt|ltd|inc|www|com|bill ?desk|razorpay|paytm\*?)\b/g;

/** Normalise merchant so "AMZN Mktp IN*2K3" and "Amazon.in Order 9921" both become "amazon". */
export function normalizeMerchant(desc: string): string {
  let s = desc.toLowerCase();
  s = s.replace(/amzn|amazon\.in|amazon/g, "amazon");
  s = s.replace(/[^a-z\s]/g, " ").replace(NOISE, " ").replace(/\s+/g, " ").trim();
  const words = s.split(" ").filter((w) => w.length > 2);
  return words.slice(0, 2).join(" ") || desc.toLowerCase().slice(0, 12);
}

export function classifyOne(
  t: Txn,
  cats: Category[],
  learned: Record<string, string>,
  overrides: Record<string, string>,
): Omit<Classified, "recurring" | "unusual"> {
  const merchant = normalizeMerchant(t.description);
  if (overrides[t.id]) {
    return { ...t, merchant, category: overrides[t.id], confidence: 1, reasoning: "Set by you during review.", alternatives: [], source: "user" };
  }
  if (learned[merchant]) {
    return { ...t, merchant, category: learned[merchant], confidence: 0.95, reasoning: `Learned from your correction for merchant "${merchant}".`, alternatives: [], source: "learned" };
  }
  const d = t.description.toLowerCase();
  const scores = cats
    .map((c) => {
      const hits = c.keywords.filter((k) => d.includes(k.toLowerCase()));
      return { category: c.name, score: hits.reduce((a, k) => a + k.length, 0), hits };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!scores.length) {
    return { ...t, merchant, category: UNCATEGORIZED, confidence: 0.2, reasoning: "No known keyword matched — please review.", alternatives: [], source: "unknown" };
  }
  const total = scores.reduce((a, s) => a + s.score, 0);
  const top = scores[0]!;
  let confidence = 0.55 + 0.4 * (top.score / total);
  if (top.score >= 6) confidence += 0.04;
  confidence = Math.min(0.97, confidence);
  const alts = scores.slice(1).map((s) => ({ category: s.category, score: +(s.score / total).toFixed(2) }));
  const reasoning =
    `Matched "${top.hits.join('", "')}" → ${top.category}.` +
    (alts.length ? ` Could also be ${alts.map((a) => a.category).join(", ")}.` : "");
  return { ...t, merchant, category: top.category, confidence: +confidence.toFixed(2), reasoning, alternatives: alts, source: "rule" };
}

export function analyze(
  txns: Txn[],
  cats: Category[],
  learned: Record<string, string>,
  overrides: Record<string, string>,
): Classified[] {
  const base = txns.map((t) => classifyOne(t, cats, learned, overrides));

  // Recurring: same merchant in >=3 distinct months with similar amounts (±15%)
  const byMerchant = new Map<string, typeof base>();
  base.forEach((b) => byMerchant.set(b.merchant, [...(byMerchant.get(b.merchant) ?? []), b]));
  const recurring = new Set<string>();
  byMerchant.forEach((list, m) => {
    const months = new Set(list.map((l) => l.date.slice(0, 7)));
    if (months.size < 3) return;
    const amts = list.map((l) => Math.abs(l.amount));
    const avg = amts.reduce((a, b) => a + b, 0) / amts.length;
    if (amts.every((a) => Math.abs(a - avg) / avg <= 0.15)) recurring.add(m);
  });

  // Unusual: amount > mean + 2σ in its category (needs >=4 samples), or > 3x merchant median
  const byCat = new Map<string, number[]>();
  base.forEach((b) => byCat.set(b.category, [...(byCat.get(b.category) ?? []), Math.abs(b.amount)]));
  const stats = new Map<string, { mean: number; sd: number; n: number }>();
  byCat.forEach((a, c) => {
    const mean = a.reduce((x, y) => x + y, 0) / a.length;
    const sd = Math.sqrt(a.reduce((x, y) => x + (y - mean) ** 2, 0) / a.length);
    stats.set(c, { mean, sd, n: a.length });
  });

  return base.map((b) => {
    const amt = Math.abs(b.amount);
    const s = stats.get(b.category)!;
    let unusual: string | null = null;
    if (s.n >= 4 && s.sd > 0 && amt > s.mean + 2 * s.sd) {
      unusual = `${(amt / s.mean).toFixed(1)}× the average ${b.category} spend (₹${Math.round(s.mean)}).`;
    } else {
      const m = (byMerchant.get(b.merchant) ?? []).map((x) => Math.abs(x.amount)).sort((x, y) => x - y);
      const med = m[Math.floor(m.length / 2)] ?? 0;
      if (m.length >= 3 && amt > 3 * med) unusual = `3×+ your usual spend at ${b.merchant}.`;
    }
    return { ...b, recurring: recurring.has(b.merchant), unusual };
  });
}

export function recommendations(rows: Classified[]): string[] {
  const out: string[] = [];
  const total = rows.reduce((a, r) => a + Math.abs(r.amount), 0) || 1;
  const byCat = new Map<string, number>();
  rows.forEach((r) => byCat.set(r.category, (byCat.get(r.category) ?? 0) + Math.abs(r.amount)));
  const dining = byCat.get("Dining") ?? 0;
  if (dining / total > 0.1) out.push(`Dining is ${Math.round((dining / total) * 100)}% of spend. Cooking 2 more meals a week could save ~₹${Math.round(dining * 0.25)}.`);
  const subs = new Set(rows.filter((r) => r.recurring && r.category === "Entertainment").map((r) => r.merchant));
  if (subs.size >= 2) out.push(`You have ${subs.size} recurring entertainment subscriptions (${[...subs].join(", ")}). Consider pausing one you rarely use.`);
  const unusual = rows.filter((r) => r.unusual);
  if (unusual.length) out.push(`${unusual.length} unusual transaction(s) totalling ₹${Math.round(unusual.reduce((a, r) => a + Math.abs(r.amount), 0))} — verify they are expected.`);
  const shop = byCat.get("Shopping") ?? 0;
  if (shop / total > 0.15) out.push(`Shopping is high at ₹${Math.round(shop)}. Try a 48-hour rule before non-essential purchases.`);
  const unc = rows.filter((r) => r.category === UNCATEGORIZED).length;
  if (unc) out.push(`${unc} transaction(s) still uncategorized — reviewing them improves future accuracy.`);
  if (!out.length) out.push("Your spending looks balanced. Keep it up!");
  return out;
}

export function parseCSV(text: string): Txn[] {
  const lines = text.trim().split(/\r?\n/);
  const header = (lines[0] ?? "").toLowerCase().split(",").map((h) => h.trim());
  const di = header.findIndex((h) => h.includes("date"));
  const de = header.findIndex((h) => h.includes("desc") || h.includes("narration") || h.includes("merchant"));
  const am = header.findIndex((h) => h.includes("amount"));
  return lines.slice(1).filter(Boolean).map((line, i) => {
    const cells = line.match(/("([^"]|"")*"|[^,]*)(,|$)/g)!.map((c) => c.replace(/,$/, "").replace(/^"|"$/g, "").trim());
    return { id: `t${Date.now()}-${i}`, date: cells[di] ?? "", description: cells[de] ?? "", amount: parseFloat(cells[am] ?? "0") || 0 };
  });
}
