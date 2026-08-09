import { useEffect, useState } from "react";
import { auth } from "./api/client";
import Login from "./pages/Login";
import CadetsTab from "./pages/CadetsTab";
import UnitTab from "./pages/UnitTab";
import MetricsTab from "./pages/MetricsTab";
import UnitPerformanceTab from "./pages/UnitPerformanceTab";

type Tab = "cadets" | "team" | "squad" | "platoon" | "metrics" | "performance";

export default function App() {
  const [authState, setAuthState] = useState<"checking" | "authed" | "unauthed">("checking");
  const [tab, setTab] = useState<Tab>("cadets");

  useEffect(() => {
    auth
      .me()
      .then(() => setAuthState("authed"))
      .catch(() => setAuthState("unauthed"));
  }, []);

  if (authState === "checking") {
    return <div className="flex min-h-screen items-center justify-center text-slate-400">Loading…</div>;
  }

  if (authState === "unauthed") {
    return <Login onSuccess={() => setAuthState("authed")} />;
  }

  async function handleLogout() {
    await auth.logout();
    setAuthState("unauthed");
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <h1 className="text-base font-bold text-slate-900">Company C Accountability</h1>
          <button onClick={handleLogout} className="text-sm text-slate-500 hover:text-slate-800">
            Log out
          </button>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4">
          {([
            { key: "cadets", label: "Cadets" },
            { key: "team", label: "Team" },
            { key: "squad", label: "Squad" },
            { key: "platoon", label: "Platoon" },
            { key: "metrics", label: "Metrics" },
            { key: "performance", label: "Unit Performance" },
          ] as { key: Tab; label: string }[]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-semibold ${
                tab === t.key ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {tab === "cadets" && <CadetsTab />}
        {tab === "team" && <UnitTab unitType="team" />}
        {tab === "squad" && <UnitTab unitType="squad" />}
        {tab === "platoon" && <UnitTab unitType="platoon" />}
        {tab === "metrics" && <MetricsTab />}
        {tab === "performance" && <UnitPerformanceTab />}
      </main>
    </div>
  );
}
