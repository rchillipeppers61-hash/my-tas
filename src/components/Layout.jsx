import { useEffect, useState } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { C } from "../lib/theme";
import {
  AccountModal,
  ChangePasswordModal,
  ResetChildPasswordModal,
} from "./account";
import Sidebar from "./Sidebar";

// Sinkronin manual sama NAV_ITEMS di Sidebar.jsx kalau nambah modul.
const NAV_ITEMS = [
  { to: "/home", label: "Beranda", icon: "🏠" },
  { to: "/wallet", label: "Wallet", icon: "💰" },
  { to: "/akademik", label: "Akademik", icon: "🎓" },
];

// Judul top bar mobile ngikutin path aktif -- prefix match ke NAV_ITEMS
// jadi sub-halaman kayak /akademik/tugas tetep kebaca "Akademik".
function pageTitle(pathname) {
  const match = NAV_ITEMS.find((item) => pathname.startsWith(item.to));
  return match?.label || "Beranda";
}

function formatClock(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}.${pad(d.getMinutes())}.${pad(d.getSeconds())}`;
}

function formatDayDate(d) {
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ============================================================
// AppShell — shell ini yang nge-wrap SEMUA modul. Modul sendiri
// nggak perlu tau apa-apa soal sidebar/nav/akun -- cukup daftar
// di NAV_ITEMS (di sini & di Sidebar.jsx) dan punya <Route> di
// App.jsx. Aksi level akun (ganti password) juga tinggal di sini,
// sama kayak Logout -- bukan di masing-masing halaman modul.
// ============================================================
export default function AppShell({ user, onLogout }) {
  const location = useLocation();
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showResetChildPassword, setShowResetChildPassword] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  return (
    <div className="min-h-screen w-full flex" style={{ background: C.bg }}>
      <Sidebar
        user={user}
        onLogout={onLogout}
        onAccountClick={() => setShowAccountMenu(true)}
      />
      <div className="flex-1 min-w-0 flex flex-col">
        <MobileTopBar
          title={pageTitle(location.pathname)}
          onLogoutClick={() => setShowLogoutConfirm(true)}
        />
        <main className="flex-1 min-w-0 pb-20 lg:pb-0">
          <Outlet />
        </main>
      </div>
      <BottomNav onAccountClick={() => setShowAccountMenu(true)} />

      {showAccountMenu && (
        <AccountModal
          user={user}
          onClose={() => setShowAccountMenu(false)}
          onOpenChangePassword={() => {
            setShowAccountMenu(false);
            setShowChangePassword(true);
          }}
          onOpenResetChildPassword={() => {
            setShowAccountMenu(false);
            setShowResetChildPassword(true);
          }}
        />
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

      {showLogoutConfirm && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 px-4"
          style={{ background: "rgba(70,63,92,0.4)" }}
          onClick={() => setShowLogoutConfirm(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-sm rounded-[28px] p-6 sm:p-7 text-center"
            style={{
              background: "#FFFFFF",
              boxShadow: "0 24px 56px -20px rgba(70,63,92,0.35)",
            }}>
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "#D9607A14" }}>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke={C.roseDeep}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </div>
            <h3
              style={{ fontFamily: "'Fraunces', serif", color: C.ink }}
              className="text-[18px] font-semibold mb-1.5">
              Keluar dari Sistem?
            </h3>
            <p className="text-[13px] mb-6" style={{ color: C.inkFaint }}>
              Kamu harus login lagi buat akses aplikasi ini.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3 rounded-2xl text-[13.5px] font-semibold"
                style={{ background: "#463F5C0f", color: C.ink }}>
                Batal
              </button>
              <button
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout();
                }}
                className="flex-1 py-3 rounded-2xl text-[13.5px] font-semibold"
                style={{ background: C.roseDeep, color: "#FFFFFF" }}>
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// MobileTopBar — sticky di atas SETIAP halaman (bukan cuma Home).
// Judulnya ngikutin halaman aktif, tombol keluar di kanan cuma
// buka modal konfirmasi -- logout beneran ditrigger dari situ.
// Desktop udah kecover lewat Sidebar, jadi ini lg:hidden.
// ============================================================
function MobileTopBar({ title, onLogoutClick }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header
      className="lg:hidden sticky top-0 z-30 flex items-center justify-between gap-2 px-4 py-3"
      style={{
        background: `linear-gradient(135deg, ${C.lavender} 0%, ${C.skyDeep} 100%)`,
        boxShadow: "0 4px 16px -8px rgba(70,63,92,0.35)",
      }}>
      <h2
        style={{ fontFamily: "'Fraunces', serif", color: "#FFFFFF" }}
        className="text-[17px] font-semibold truncate min-w-0">
        {title}
      </h2>

      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="text-right leading-tight">
          <p
            className="text-[14px] font-bold tabular-nums whitespace-nowrap"
            style={{ color: "#FFFFFF", fontFamily: "'Fraunces', serif" }}>
            {formatClock(now)}
          </p>
          <p
            className="text-[10.5px] font-medium whitespace-nowrap"
            style={{ color: "#FFFFFFCC" }}>
            {formatDayDate(now)}
          </p>
        </div>

        <button
          type="button"
          onClick={onLogoutClick}
          aria-label="Keluar"
          className="flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center active:scale-95 transition-transform"
          style={{
            background: C.roseDeep,
            boxShadow: "0 8px 16px -8px rgba(217,96,122,0.6)",
          }}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </header>
  );
}

// ============================================================
// BottomNav — versi mobile dari nav, dipakai internal oleh AppShell.
// ============================================================
function BottomNav({ onAccountClick }) {
  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 flex items-stretch overflow-x-auto z-40"
      style={{
        background: "#FFFFFF",
        borderTop: "1px solid #463F5C14",
        boxShadow: "0 -8px 24px -16px rgba(70,63,92,0.25)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
      }}>
      <style>{`nav::-webkit-scrollbar { display: none; }`}</style>
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className="flex-1 min-w-[76px] flex-shrink-0 flex flex-col items-center justify-center gap-1 py-3 text-[13px] font-semibold whitespace-nowrap"
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
        className="flex-1 min-w-[76px] flex-shrink-0 flex flex-col items-center justify-center gap-1 py-3 text-[13px] font-semibold whitespace-nowrap"
        style={{ color: C.inkFaint }}>
        <span className="text-[24px] leading-none">🔒</span>
        Akun
      </button>
    </nav>
  );
}
