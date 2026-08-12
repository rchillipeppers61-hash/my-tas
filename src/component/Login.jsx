import { useState } from "react";
import { supabase } from "../supabaseClient";
import { C, FONT_IMPORT } from "./theme";

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const u = username.trim().toLowerCase();

    const { data, error: dbError } = await supabase
      .from("users")
      .select("id, username, password, role, linked_child_id")
      .eq("username", u)
      .single();

    setLoading(false);

    if (dbError || !data) {
      setError("Username atau password salah.");
      return;
    }

    if (data.password !== password) {
      setError("Username atau password salah.");
      return;
    }

    const loggedInUser = {
      id: data.id,
      username: data.username,
      role: data.role,
      linked_child_id: data.linked_child_id,
    };
    localStorage.setItem("mywallet_user", JSON.stringify(loggedInUser));
    onLoginSuccess?.(loggedInUser);
  }

  return (
    <div
      className="min-h-screen w-full flex"
      style={{ background: C.bg, fontFamily: "'Inter', sans-serif" }}>
      <style>{FONT_IMPORT}</style>

      {/* Left panel — illustration + welcome copy, desktop only */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center px-12">
        <div
          className="absolute -top-28 -left-20 w-96 h-96 rounded-full opacity-50 blur-3xl"
          style={{ background: C.mint }}
        />
        <div
          className="absolute bottom-0 -right-10 w-80 h-80 rounded-full opacity-40 blur-3xl"
          style={{ background: C.rose }}
        />
        <div
          className="absolute top-1/2 left-1/3 w-64 h-64 rounded-full opacity-30 blur-3xl"
          style={{ background: C.sky }}
        />

        <div className="relative max-w-sm">
          <PiggyIllustration />
          <p
            className="text-[11px] tracking-[0.22em] uppercase font-semibold mt-8"
            style={{ color: C.lavender }}>
            Buku Kas Keluarga
          </p>
          <h2
            style={{ fontFamily: "'Fraunces', serif", color: C.ink }}
            className="text-[32px] font-semibold leading-[1.15] mt-2">
            Satu catatan hari ini,
            <br />
            satu kebiasaan baik nanti.
          </h2>
          <p
            className="text-[14px] mt-3 leading-relaxed"
            style={{ color: C.inkSoft }}>
            Catat setiap uang masuk dan keluar, biar di akhir bulan kamu tau
            persis kemana perginya — bukan cuma nebak-nebak.
          </p>
          <p
            className="text-[18px] mt-6"
            style={{ fontFamily: "'Caveat', cursive", color: C.lavender }}>
            "pelan-pelan, yang penting jujur ✎"
          </p>
        </div>
      </div>

      {/* Right panel — the form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 py-10 relative">
        <div
          className="lg:hidden absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-40 blur-3xl pointer-events-none"
          style={{ background: C.mint }}
        />
        <div
          className="lg:hidden absolute top-1/3 -left-20 w-56 h-56 rounded-full opacity-30 blur-3xl pointer-events-none"
          style={{ background: C.rose }}
        />

        <form
          onSubmit={handleLogin}
          className="relative w-full max-w-sm rounded-[28px] p-7 sm:p-8"
          style={{
            background: "#FFFFFF",
            boxShadow: "0 20px 48px -20px rgba(70,63,92,0.28)",
          }}>
          <div className="lg:hidden flex justify-center mb-5">
            <CoinBadge />
          </div>

          <p
            className="text-[11px] tracking-[0.2em] uppercase mb-1 font-semibold"
            style={{ color: C.lavender }}>
            Selamat Datang
          </p>
          <h1
            style={{ fontFamily: "'Fraunces', serif", color: C.ink }}
            className="text-[27px] font-semibold mb-1">
            My Wallet
          </h1>
          <p className="text-[13px] mb-6" style={{ color: C.inkFaint }}>
            Masuk dulu buat mulai mencatat.
          </p>

          <label
            className="text-[11px] uppercase tracking-wide font-medium"
            style={{ color: C.inkFaint }}>
            Username
          </label>
          <div className="relative mt-1.5 mb-4">
            <span
              className="absolute left-3.5 top-1/2 -translate-y-1/2"
              style={{ color: C.inkFaint }}>
              <UserIcon />
            </span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoCapitalize="off"
              placeholder="username kamu"
              className="w-full pl-10 pr-3.5 py-3 rounded-2xl text-[15px] outline-none transition-shadow focus:ring-2"
              style={{
                background: "#463F5C0a",
                color: C.ink,
                "--tw-ring-color": C.lavenderSoft,
              }}
            />
          </div>

          <label
            className="text-[11px] uppercase tracking-wide font-medium"
            style={{ color: C.inkFaint }}>
            Password
          </label>
          <div className="relative mt-1.5 mb-5">
            <span
              className="absolute left-3.5 top-1/2 -translate-y-1/2"
              style={{ color: C.inkFaint }}>
              <LockIcon />
            </span>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full pl-10 pr-11 py-3 rounded-2xl text-[15px] outline-none transition-shadow focus:ring-2"
              style={{
                background: "#463F5C0a",
                color: C.ink,
                "--tw-ring-color": C.lavenderSoft,
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
              style={{ color: C.inkFaint }}
              aria-label={
                showPassword ? "Sembunyikan password" : "Tampilkan password"
              }>
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>

          {error && (
            <div
              className="text-[12px] mb-4 px-3.5 py-2.5 rounded-xl"
              style={{ background: "#D9607A14", color: C.roseDeep }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl font-semibold text-[14px] disabled:opacity-50 transition-transform active:scale-[0.98]"
            style={{
              background: `linear-gradient(135deg, ${C.lavender}, ${C.lavenderSoft})`,
              color: "#FFFFFF",
            }}>
            {loading ? "Memproses..." : "Masuk"}
          </button>

          <p
            className="text-center text-[12px] mt-5"
            style={{ color: C.inkFaint }}>
            Punya pertanyaan soal akunmu? Tanya Ayah/Ibu ya 🙂
          </p>
        </form>
      </div>
    </div>
  );
}

function UserIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round">
      <path d="M1 12s3-8 11-8 11 8 11 8-3 8-11 8-11-8-11-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-10-8-10-8a18.7 18.7 0 0 1 4.22-5.94M9.9 4.24A10.4 10.4 0 0 1 12 4c7 0 10 8 10 8a18.6 18.6 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <path d="M1 1l22 22" />
    </svg>
  );
}

function CoinBadge() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      <circle cx="28" cy="28" r="26" fill={C.lavenderSoft} opacity="0.25" />
      <circle cx="28" cy="28" r="19" fill={C.lavender} />
      <text
        x="28"
        y="35"
        textAnchor="middle"
        fontSize="20"
        fontFamily="'Fraunces', serif"
        fontWeight="600"
        fill="#FFFFFF">
        Rp
      </text>
    </svg>
  );
}

/* Signature illustration: a little jar of savings with coins stacking up
   and a hand-drawn arrow, tying the login moment to the app's purpose. */
function PiggyIllustration() {
  return (
    <svg width="220" height="200" viewBox="0 0 220 200" fill="none">
      {/* jar */}
      <path
        d="M60 90 L58 175 Q58 188 72 188 L148 188 Q162 188 162 175 L160 90 Z"
        fill="#FFFFFF"
        stroke={C.ink}
        strokeWidth="2.5"
        opacity="0.9"
      />
      <rect
        x="55"
        y="78"
        width="110"
        height="16"
        rx="8"
        fill={C.lavenderSoft}
        stroke={C.ink}
        strokeWidth="2.5"
      />
      <rect
        x="95"
        y="60"
        width="30"
        height="20"
        rx="4"
        fill={C.lavenderSoft}
        stroke={C.ink}
        strokeWidth="2.5"
      />

      {/* coins inside jar */}
      <ellipse
        cx="90"
        cy="165"
        rx="20"
        ry="7"
        fill={C.mint}
        stroke={C.ink}
        strokeWidth="2"
      />
      <ellipse
        cx="120"
        cy="158"
        rx="20"
        ry="7"
        fill={C.sky}
        stroke={C.ink}
        strokeWidth="2"
      />
      <ellipse
        cx="98"
        cy="145"
        rx="20"
        ry="7"
        fill={C.rose}
        stroke={C.ink}
        strokeWidth="2"
      />
      <ellipse
        cx="118"
        cy="132"
        rx="20"
        ry="7"
        fill={C.mint}
        stroke={C.ink}
        strokeWidth="2"
      />

      {/* falling coin */}
      <circle
        cx="150"
        cy="45"
        r="14"
        fill={C.rose}
        stroke={C.ink}
        strokeWidth="2.5"
      />
      <text
        x="150"
        y="50"
        textAnchor="middle"
        fontSize="13"
        fontFamily="'Fraunces', serif"
        fontWeight="600"
        fill={C.ink}>
        Rp
      </text>

      {/* hand-drawn arrow from coin to jar */}
      <path
        d="M143 60 Q120 75 110 88"
        stroke={C.lavender}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        strokeDasharray="1 7"
      />
      <path
        d="M104 82 L110 88 L117 84"
        stroke={C.lavender}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* sparkle accents */}
      <path
        d="M35 55 L37 61 L43 63 L37 65 L35 71 L33 65 L27 63 L33 61 Z"
        fill={C.mint}
        opacity="0.8"
      />
      <path
        d="M185 110 L186.5 114 L190 115.5 L186.5 117 L185 121 L183.5 117 L180 115.5 L183.5 114 Z"
        fill={C.sky}
        opacity="0.8"
      />
    </svg>
  );
}
