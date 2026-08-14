import { Outlet } from "react-router-dom";
import { C } from "../shared/theme";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";

// Shell ini yang nge-wrap SEMUA modul. Modul sendiri nggak perlu tau
// apa-apa soal sidebar/nav -- cukup daftar di NAV_ITEMS (Sidebar & BottomNav)
// dan punya <Route> di App.jsx.
export default function AppShell({ user, onLogout }) {
  return (
    <div className="min-h-screen w-full flex" style={{ background: C.bg }}>
      <Sidebar user={user} onLogout={onLogout} />
      <main className="flex-1 min-w-0 pb-16 lg:pb-0">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
