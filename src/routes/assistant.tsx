import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Bot, Send, User } from "lucide-react";
import { AppShell, PageHeader, card, btn, btnGhost, input } from "@/components/AppShell";
import { useApp, buildSummary } from "@/lib/store";
import { askAssistant } from "@/lib/assistant.functions";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "AI Financial Assistant — SpendSmart AI" },
      { name: "description", content: "Chat with an AI assistant that understands your spending." },
      { property: "og:title", content: "AI Financial Assistant — SpendSmart AI" },
      { property: "og:description", content: "Ask questions about your spending and get personalized advice." },
    ],
  }),
  component: Assistant,
});

type Msg = { role: "user" | "ai"; text: string };
const SUGGESTIONS = ["Where am I overspending?", "How can I save ₹5,000 next month?", "Which subscriptions should I cancel?", "Explain my unusual transactions"];

function Assistant() {
  const { rows, budget } = useApp();
  const ask = useServerFn(askAssistant);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "ai", text: "Hi! I'm SpendSmart AI. I've read your transactions — ask me anything about your spending." }]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth" }), [msgs]);

  const send = async (question: string) => {
    if (!question.trim() || busy) return;
    setMsgs((m) => [...m, { role: "user", text: question }]);
    setQ("");
    setBusy(true);
    try {
      const res = await ask({ data: { question, summary: buildSummary(rows, budget) } });
      setMsgs((m) => [...m, { role: "ai", text: res.error ? `⚠️ ${res.error}` : res.answer }]);
    } catch {
      setMsgs((m) => [...m, { role: "ai", text: "⚠️ Something went wrong. Please try again." }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <PageHeader title="AI financial assistant" subtitle="Powered by Lovable AI · answers use only your own data." />
      <section className={`${card} flex h-[65vh] flex-col`}>
        <div className="flex-1 space-y-4 overflow-y-auto pr-2">
          {msgs.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${m.role === "ai" ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"}`}>
                {m.role === "ai" ? <Bot size={16} /> : <User size={16} />}
              </div>
              <div className={`max-w-[80%] whitespace-pre-wrap rounded-xl px-4 py-2 text-sm ${m.role === "ai" ? "bg-muted" : "bg-primary text-primary-foreground"}`}>{m.text.replace(/\*\*/g, "")}</div>
            </div>
          ))}
          {busy && <p className="animate-pulse text-sm text-muted-foreground">SpendSmart AI is thinking…</p>}
          <div ref={end} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => <button key={s} className={`${btnGhost} py-1 text-xs`} onClick={() => send(s)} disabled={busy}>{s}</button>)}
        </div>
        <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); send(q); }}>
          <input className={`${input} flex-1`} placeholder="Ask about your spending…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className={btn} disabled={busy}><Send size={16} />Send</button>
        </form>
      </section>
    </AppShell>
  );
}
