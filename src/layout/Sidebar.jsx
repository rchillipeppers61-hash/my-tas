import { NavLink } from "react-router-dom";
import { C } from "../shared/theme";
import { capitalize } from "../shared/lib/format";

// Daftar modul ada DI SINI SAJA. Nambah modul baru = nambah 1 baris,
// nggak perlu ubah apa-apa di komponen lain.
const NAV_ITEMS = [
  { to: "/home", label: "Beranda", icon: "🏠" },
  { to: "/wallet", label: "Wallet", icon: "💰" },
  // { to: "/akademik", label: "Akademik", icon: "📚" }, ← nanti nyusul
];

export default function Sidebar({ user, onLogout }) {
  const name = capitalize(user?.username) || "Kamu";

  return (
    <aside
      className="hidden lg:flex lg:flex-col w-64 flex-shrink-0 min-h-screen px-4 py-6 sticky top-0"
      style={{ background: "#FFFFFF", borderRight: "1px solid #463F5C14" }}>
      <div className="px-2 mb-8">
        <p
          className="text-[11px] tracking-[0.2em] uppercase font-semibold"
          style={{ color: C.lavender }}>
          My Wallet
        </p>
        <p
          style={{ fontFamily: "'Fraunces', serif", color: C.ink }}
          className="text-[18px] font-semibold truncate">
          Halo, {name}
        </p>
      </div>

      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-[13.5px] font-semibold transition-colors"
            style={({ isActive }) => ({
              background: isActive ? C.lavender : "transparent",
              color: isActive ? "#FFFFFF" : C.inkSoft,
            })}>
            <span className="text-[16px] leading-none">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <button
        onClick={onLogout}
        className="text-[12.5px] font-semibold px-3.5 py-2.5 rounded-2xl text-left"
        style={{ background: "#D9607A1a", color: C.roseDeep }}>
        Keluar
      </button>
    </aside>
  );
}
