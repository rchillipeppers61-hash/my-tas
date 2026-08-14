import { NavLink } from "react-router-dom";
import { C } from "../shared/theme";

// Sinkronin manual sama NAV_ITEMS di Sidebar.jsx kalau nambah modul.
const NAV_ITEMS = [
  { to: "/home", label: "Beranda", icon: "🏠" },
  { to: "/wallet", label: "Wallet", icon: "💰" },
  // { to: "/akademik", label: "Akademik", icon: "📚" }, ← nanti nyusul
];

export default function BottomNav() {
  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 flex items-stretch justify-around z-40"
      style={{
        background: "#FFFFFF",
        borderTop: "1px solid #463F5C14",
        boxShadow: "0 -8px 24px -16px rgba(70,63,92,0.25)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}>
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10.5px] font-semibold"
          style={({ isActive }) => ({
            color: isActive ? C.lavender : C.inkFaint,
          })}>
          <span className="text-[19px] leading-none">{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
