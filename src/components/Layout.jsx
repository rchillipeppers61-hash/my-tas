import { useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { C } from "../lib/theme";
import { ChangePasswordModal, ResetChildPasswordModal } from "./account";
import Sidebar from "./Sidebar";

// Sinkronin manual sama NAV_ITEMS di Sidebar.jsx kalau nambah modul.
const NAV_ITEMS = [
  { to: "/home", label: "Beranda", icon: "🏠" },
  { to: "/wallet", label: "Wallet", icon: "💰" },
  { to: "/akademik", label: "Akademik", icon: "🎓" },
  { to: "/journal", label: "Jurnal", icon: "📝" },
];

// ============================================================
// AppShell — shell ini yang nge-wrap SEMUA modul. Modul sendiri
// nggak perlu tau apa-apa soal sidebar/nav/akun -- cukup daftar
// di NAV_ITEMS (di sini & di Sidebar.jsx) dan punya <Route> di
// App.jsx. Aksi level akun (ganti password) juga tinggal di sini,
// sama kayak Logout -- bukan di masing-masing halaman modul.
// ============================================================
export default function AppShell({ user, onLogout }) {
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showResetChildPassword, setShowResetChildPassword] = useState(false);

  const isParent = user?.role === "orang_tua";

  return (
    <div className="min-h-screen w-full flex" style={{ background: C.bg }}>
      <Sidebar
        user={user}
        onLogout={onLogout}
        onAccountClick={() => setShowAccountMenu(true)}
      />
      <main className="flex-1 min-w-0 pb-20 lg:pb-0">
        <Outlet />
      </main>
      <BottomNav
        onLogout={onLogout}
        onAccountClick={() => setShowAccountMenu(true)}
      />

      {showAccountMenu && (
        <div
          className="fixed inset-0 flex items-end sm:items-center justify-center z-50 px-4 pb-4 sm:pb-4"
          style={{ background: "rgba(70,63,92,0.4)" }}
          onClick={() => setShowAccountMenu(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-sm rounded-[28px] p-6 sm:p-7"
            style={{
              background: "#FFFFFF",
              boxShadow: "0 24px 56px -20px rgba(70,63,92,0.35)",
            }}>
            <h3
              style={{ fontFamily: "'Fraunces', serif", color: C.ink }}
              className="text-[18px] font-semibold mb-4">
              Akun
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setShowAccountMenu(false);
                  setShowChangePassword(true);
                }}
                className="w-full text-left px-4 py-3 rounded-2xl text-[13.5px] font-medium"
                style={{ background: "#463F5C0a", color: C.ink }}>
                Ganti Password Saya
              </button>
              {isParent && (
                <button
                  onClick={() => {
                    setShowAccountMenu(false);
                    setShowResetChildPassword(true);
                  }}
                  className="w-full text-left px-4 py-3 rounded-2xl text-[13.5px] font-medium"
                  style={{ background: "#463F5C0a", color: C.ink }}>
                  Ganti Password Anak
                </button>
              )}
            </div>
            <button
              onClick={() => setShowAccountMenu(false)}
              className="w-full mt-4 py-3 rounded-2xl text-[13px] font-semibold"
              style={{ background: "#463F5C0f", color: C.ink }}>
              Tutup
            </button>
          </div>
        </div>
      )}

      {showChangePassword && (
        <ChangePasswordModal
          user={user}
          onClose={() => setShowChangePassword(false)}
        />
      )}

      {showResetChildPassword && (
        <ResetChildPasswordModal
          user={user}
          onClose={() => setShowResetChildPassword(false)}
        />
      )}
    </div>
  );
}

// ============================================================
// BottomNav — versi mobile dari nav, dipakai internal oleh AppShell.
// ============================================================
function BottomNav({ onLogout, onAccountClick }) {
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
          className="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[13px] font-semibold"
          style={({ isActive }) => ({
            color: isActive ? C.lavender : C.inkFaint,
          })}>
          <span className="text-[24px] leading-none">{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
      <button
        type="button"
        onClick={onAccountClick}
        className="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[13px] font-semibold"
        style={{ color: C.inkFaint }}>
        <span className="text-[24px] leading-none">🔒</span>
        Akun
      </button>
      <button
        type="button"
        onClick={onLogout}
        className="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[13px] font-semibold"
        style={{ color: C.roseDeep }}>
        <span className="text-[24px] leading-none">🚪</span>
        Keluar
      </button>
    </nav>
  );
}
