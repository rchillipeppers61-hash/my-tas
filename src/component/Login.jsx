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
      className="min-h-screen w-full flex items-center justify-center px-4"
      style={{ background: C.bg, fontFamily: "'Inter', sans-serif" }}>
      <style>{FONT_IMPORT}</style>
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm rounded-3xl p-6"
        style={{
          background: "#FFFFFF",
          boxShadow: "0 12px 28px -16px rgba(70,63,92,0.22)",
        }}>
        <p
          className="text-[11px] tracking-[0.2em] uppercase mb-1 font-semibold"
          style={{ color: C.lavender }}>
          Buku Kas
        </p>
        <h1
          style={{ fontFamily: "'Fraunces', serif", color: C.ink }}
          className="text-[26px] font-semibold mb-5">
          My Wallet
        </h1>

        <label
          className="text-[11px] uppercase tracking-wide font-medium"
          style={{ color: C.inkFaint }}>
          Username
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          autoCapitalize="off"
          className="w-full mt-1.5 mb-3 px-3.5 py-3 rounded-2xl text-[15px] outline-none"
          style={{ background: "#463F5C0a", color: C.ink }}
        />

        <label
          className="text-[11px] uppercase tracking-wide font-medium"
          style={{ color: C.inkFaint }}>
          Password
        </label>
        <div className="relative mt-1.5 mb-4">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-3.5 py-3 pr-11 rounded-2xl text-[15px] outline-none"
            style={{ background: "#463F5C0a", color: C.ink }}
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
            {showPassword ? (
              // mata dicoret (hide)
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
            ) : (
              // mata terbuka (show)
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
            )}
          </button>
        </div>

        {error && (
          <p className="text-[12px] mb-3" style={{ color: C.roseDeep }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-2xl font-semibold text-[14px] disabled:opacity-50"
          style={{ background: C.lavenderSoft, color: "#FFFFFF" }}>
          {loading ? "Memproses..." : "Masuk"}
        </button>
      </form>
    </div>
  );
}
