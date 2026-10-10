import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { LayoutDashboard, Receipt, PieChart, BellRing, Bot, Wallet } from "lucide-react";
import { useApp } from "@/lib/store";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/transactions", label: "Transactions", icon: Receipt },
  { to: "/analysis", label: "Analysis", icon: PieChart },
  { to: "/alerts", label: "Alerts", icon: BellRing },
  { to: "/assistant", label: "AI Assistant", icon: Bot },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { rows } = useApp();
  const alerts = rows.filter((r) => r.unusual).length;
  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-border bg-primary text-primary-foreground md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:border-b-0">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-accent-foreground"><Wallet size={18} /></div>
          <div>
            <p className="font-[var(--font-display)] text-lg leading-none">SpendSmart AI</p>
            <p className="text-xs opacity-70">Personal expense analysis</p>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} activeOptions={{ exact: to === "/" }}
              className="flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm opacity-80 hover:bg-primary-foreground/10 hover:opacity-100"
              activeProps={{ className: "bg-primary-foreground/15 !opacity-100 font-semibold" }}>
              <Icon size={17} /> {label}
              {to === "/alerts" && alerts > 0 && <span className="ml-auto rounded-full bg-accent px-2 text-xs text-accent-foreground">{alerts}</span>}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-5 py-8">{children}</main>
    </div>
  );
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl md:text-4xl">{title}</h1>
        <p className="mt-1 text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

export const card = "rounded-xl border border-border bg-card p-5 shadow-sm";
export const btn = "inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50";
export const btnGhost = "inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm hover:bg-muted";
export const input = "rounded-md border border-input bg-background px-3 py-2 text-sm";
export const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--accent)", "var(--muted-foreground)", "var(--destructive)", "var(--secondary-foreground)", "var(--ring)", "var(--border)"];
