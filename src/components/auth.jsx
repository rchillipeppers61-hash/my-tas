import { useState } from "react";
import { supabase } from "../supabaseClient";
import { C, FONT_IMPORT } from "../lib/theme";

// ============================================================
// Login
// ============================================================
export function Login({ onLoginSuccess, onSwitchToSignUp }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [showForgotHint, setShowForgotHint] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setShowForgotHint(false);
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

    // "Ingat saya" checked -> persist across browser restarts (localStorage).
    // Unchecked -> only remember for this tab session (sessionStorage).
    if (remember) {
      sessionStorage.removeItem("mywallet_user");
      localStorage.setItem("mywallet_user", JSON.stringify(loggedInUser));
    } else {
      localStorage.removeItem("mywallet_user");
      sessionStorage.setItem("mywallet_user", JSON.stringify(loggedInUser));
    }
    onLoginSuccess?.(loggedInUser);
  }

  return (
    <div
      className="min-h-screen w-full flex flex-col lg:flex-row"
      style={{ background: C.bg, fontFamily: "'Inter', sans-serif" }}>
      <style>{FONT_IMPORT}</style>

      {/* Hero banner — full-bleed on mobile, left half on desktop */}
      <div
        className="relative w-full h-[228px] sm:h-[260px] lg:h-screen lg:w-1/2 flex-shrink-0 overflow-hidden flex flex-col justify-end"
        style={{
          background: `linear-gradient(135deg, ${C.lavender} 0%, ${C.lavenderSoft} 45%, ${C.skyDeep} 100%)`,
        }}>
        <div
          className="absolute -top-16 -right-10 w-56 h-56 rounded-full opacity-30 blur-3xl"
          style={{ background: C.sky }}
        />
        <div
          className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full opacity-20 blur-3xl"
          style={{ background: C.rose }}
        />

        {/* Signature — oversized bleeding wordmark. TAS = Teman Aktivitas
            Sehari-hari, bukan cuma nama gaya-gayaan: nama ini nyeritain
            appnya sebagai hub (duit, jadwal, tugas), bukan Wallet doang. */}
        <p
          className="relative text-[11px] sm:text-[12px] px-6 sm:px-8 lg:px-12 tracking-[0.3em] uppercase font-semibold mb-1"
          style={{ color: "#FFFFFF", opacity: 0.75 }}>
          Teman Aktivitas Sehari-hari
        </p>
        <p
          aria-hidden="true"
          style={{
            fontFamily: "'Fraunces', serif",
            color: "#FFFFFF",
            opacity: 0.92,
            fontSize: "clamp(88px, 26vw, 168px)",
            lineHeight: 0.82,
            letterSpacing: "-0.03em",
            marginLeft: "-0.04em",
            textShadow: "0 10px 30px rgba(70,63,92,0.18)",
          }}
          className="font-semibold select-none whitespace-nowrap px-1">
          TAS
        </p>
        <p
          className="relative text-[13px] sm:text-[14px] px-6 sm:px-8 lg:px-12 mb-6 sm:mb-8 lg:mb-10 lg:max-w-xs"
          style={{ color: "#FFFFFF", opacity: 0.9 }}>
          Uang jajan, jadwal, tugas kuliah — semua kesimpen rapi di satu tempat.
        </p>

        <FloatingDoodles />
      </div>

      {/* Card — overlaps the hero on mobile, sits centered on desktop */}
      <div className="relative flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-10 -mt-7 lg:mt-0 pb-6 lg:pb-0 overflow-hidden">
        {/* Ambient wash so the right panel doesn't read as flat white next
            to the styled hero — echoes the hero's blurred color blobs. */}
        <div
          className="hidden lg:block absolute -top-24 right-[-6rem] w-[420px] h-[420px] rounded-full opacity-[0.14] blur-3xl pointer-events-none"
          style={{ background: C.mint }}
        />
        <div
          className="hidden lg:block absolute bottom-[-8rem] left-[-6rem] w-[380px] h-[380px] rounded-full opacity-[0.12] blur-3xl pointer-events-none"
          style={{ background: C.rose }}
        />

        <form
          onSubmit={handleLogin}
          className="relative w-full max-w-[400px] rounded-[28px] pt-11 px-6 sm:px-7 pb-7"
          style={{
            background: "#FFFFFF",
            boxShadow:
              "0 24px 60px -20px rgba(70,63,92,0.22), 0 2px 8px -2px rgba(70,63,92,0.10)",
          }}>
          <div className="absolute left-1/2 -top-9 -translate-x-1/2">
            <TasBadge />
          </div>

          <p
            className="text-center text-[11px] tracking-[0.2em] uppercase mb-1 font-semibold"
            style={{ color: C.lavender }}>
            Selamat Datang
          </p>
          <h1
            style={{ fontFamily: "'Fraunces', serif", color: C.ink }}
            className="text-center text-[24px] font-semibold mb-1">
            Masuk ke TAS
          </h1>
          <p
            className="text-center text-[13px] mb-6"
            style={{ color: C.inkFaint }}>
            Satu akun, semua urusan harian kuliahmu.
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
              autoComplete="username"
              placeholder="username kamu"
              className="w-full pl-10 pr-3.5 py-3 rounded-2xl text-[15px] outline-none border-[1.5px] transition-shadow focus:ring-4 focus:ring-[#8B72C42A]"
              style={{
                background: "#463F5C08",
                color: C.ink,
                borderColor: "#463F5C1F",
              }}
            />
          </div>

          <label
            className="text-[11px] uppercase tracking-wide font-medium"
            style={{ color: C.inkFaint }}>
            Password
          </label>
          <div className="relative mt-1.5 mb-3">
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
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full pl-10 pr-12 py-3 rounded-2xl text-[15px] outline-none border-[1.5px] transition-shadow focus:ring-4 focus:ring-[#8B72C42A]"
              style={{
                background: "#463F5C08",
                color: C.ink,
                borderColor: "#463F5C1F",
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
              style={{ color: C.inkFaint, "--tw-ring-color": C.lavender }}
              aria-label={
                showPassword ? "Sembunyikan password" : "Tampilkan password"
              }>
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>

          <div className="flex items-center justify-between mb-5 mt-1 -mx-1">
            <button
              type="button"
              onClick={() => setRemember((v) => !v)}
              className="flex items-center gap-2 group rounded-md outline-none focus-visible:ring-2 focus-visible:ring-offset-1 py-2 px-1"
              style={{ "--tw-ring-color": C.lavender }}>
              <span
                className="w-5 h-5 rounded-md flex items-center justify-center transition-colors"
                style={{
                  background: remember ? C.lavender : "#463F5C0d",
                  border: remember
                    ? `1px solid ${C.lavender}`
                    : "1px solid #463F5C33",
                }}>
                {remember && <CheckIcon />}
              </span>
              <span className="text-[12.5px]" style={{ color: C.inkSoft }}>
                Ingat saya
              </span>
            </button>
            <button
              type="button"
              onClick={() => setShowForgotHint((v) => !v)}
              className="text-[12.5px] font-medium rounded-md outline-none focus-visible:ring-2 focus-visible:ring-offset-1 py-2 px-1"
              style={{ color: C.lavender, "--tw-ring-color": C.lavender }}>
              Lupa password?
            </button>
          </div>

          {showForgotHint && (
            <div
              className="flex items-start gap-2 text-[12px] mb-4 px-3.5 py-2.5 rounded-xl"
              style={{ background: "#8B72C414", color: C.lavender }}>
              <span className="flex-shrink-0">🔒</span>
              <span>
                Password diatur oleh orang tua / admin. Hubungi mereka untuk
                reset ya.
              </span>
            </div>
          )}

          {error && (
            <div
              className="flex items-center gap-2 text-[12px] mb-4 px-3.5 py-2.5 rounded-xl font-medium"
              style={{ background: "#D9607A14", color: C.roseDeep }}>
              <span className="flex-shrink-0">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl font-semibold text-[14px] disabled:opacity-50 transition-transform active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{
              background: `linear-gradient(135deg, ${C.lavender}, ${C.skyDeep})`,
              color: "#FFFFFF",
              boxShadow: "0 16px 32px -16px rgba(139,114,196,0.6)",
              "--tw-ring-color": C.lavender,
            }}>
            {loading ? "Memproses..." : "Masuk"}
          </button>

          <button
            type="button"
            onClick={onSwitchToSignUp}
            className="w-full text-center mt-5 text-[12.5px] font-medium"
            style={{ color: C.lavender }}>
            Belum punya akun? Daftar
          </button>

          <p
            className="text-center mt-6 text-[12px]"
            style={{ color: C.inkFaint }}>
            © 2026 TAS · Teman Aktivitas Sehari-hari
          </p>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// SignUp
// ============================================================

// Kode 6 karakter, huruf besar + angka, tanpa karakter yang gampang
// ketuker (0/O, 1/I) biar gampang dibacain manual (WA, lisan, dll).
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode() {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

export function SignUp({ onSignUpSuccess, onBackToLogin }) {
  // NOTE: nilai role disamain sama App.jsx ("orang_tua" utk parent).
  // Untuk anak gua asumsikan "anak" -- kalau ternyata beda di
  // ChildDashboard.jsx, tinggal ganti string ini + di roleOptions bawah.
  const [role, setRole] = useState("anak"); // "anak" | "orang_tua"
  const [username, setUsername] = useState("");
  const [namaLengkap, setNamaLengkap] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Ditampilkan setelah sign up sukses TANPA kode (belum ke-link),
  // biar user bisa share kode ini ke pasangan akunnya (ortu/anak).
  const [generatedCode, setGeneratedCode] = useState(null);
  // Disimpen biar pas klik "Lanjut ke aplikasi" di layar kode,
  // data user yang baru dibuat tetep ke-pass ke onSignUpSuccess.
  const [pendingUser, setPendingUser] = useState(null);
  const [copied, setCopied] = useState(false);

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API gagal (misal browser lama/permission) -- diemin aja,
      // user masih bisa select-copy manual dari teks yang tampil.
    }
  }

  async function handleSignUp(e) {
    e.preventDefault();
    setError("");

    const u = username.trim().toLowerCase();
    const nama = namaLengkap.trim();

    if (!u || !password || !nama) {
      setError("Nama lengkap, username, dan password wajib diisi.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }
    if (password.length < 4) {
      setError("Password minimal 4 karakter.");
      return;
    }

    setLoading(true);

    // 1. Pastikan username belum dipakai
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("username", u)
      .maybeSingle();

    if (existing) {
      setLoading(false);
      setError("Username sudah dipakai, coba yang lain.");
      return;
    }

    // 2. Buat akun baru
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert({
        username: u,
        password, // NOTE: sama seperti pola project sekarang (plaintext).
        role,
        nama_lengkap: nama,
        linked_child_id: null,
      })
      .select("id, username, role, linked_child_id, nama_lengkap")
      .single();

    if (insertError || !newUser) {
      setLoading(false);
      setError("Gagal membuat akun. Coba lagi ya.");
      return;
    }

    const code = inviteCodeInput.trim().toUpperCase();

    // 3a. Kalau user MASUKIN kode undangan -> coba langsung link
    if (code) {
      const result = await redeemInviteCode(code, newUser.id, role);
      setLoading(false);

      if (!result.success) {
        // Akun tetap kebuat, cuma link-nya gagal. Kasih tau,
        // biar user bisa coba masukin kode lagi lain waktu
        // (fitur "masukin kode nanti" bisa ditambah di dashboard).
        setError(result.message);
        onSignUpSuccess?.(newUser);
        return;
      }

      onSignUpSuccess?.(newUser);
      return;
    }

    // 3b. Kalau TIDAK ada kode -> generate kode buat di-share
    const newCode = generateCode();
    const { error: codeError } = await supabase.from("invite_codes").insert({
      code: newCode,
      user_id: newUser.id,
    });

    setLoading(false);

    if (codeError) {
      // Akun tetap jadi, tapi kode gagal dibuat. User masih bisa
      // dilink manual nanti, jadi tetep lanjutkan.
      onSignUpSuccess?.(newUser);
      return;
    }

    setPendingUser(newUser);
    setGeneratedCode(newCode);
  }

  // Cari kode di invite_codes, validasi, terus set linked_child_id
  // di sisi akun PARENT (siapapun yang jadi parent-nya).
  async function redeemInviteCode(code, newUserId, newUserRole) {
    const { data: invite, error: inviteError } = await supabase
      .from("invite_codes")
      .select("id, user_id, expires_at, used_at")
      .eq("code", code)
      .is("used_at", null)
      .maybeSingle();

    if (inviteError || !invite) {
      return {
        success: false,
        message: "Kode undangan tidak ditemukan atau sudah dipakai.",
      };
    }

    if (new Date(invite.expires_at) < new Date()) {
      return { success: false, message: "Kode undangan sudah kedaluwarsa." };
    }

    const { data: owner, error: ownerError } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", invite.user_id)
      .single();

    if (ownerError || !owner) {
      return { success: false, message: "Akun pemilik kode tidak ditemukan." };
    }

    if (owner.role === newUserRole) {
      return {
        success: false,
        message: `Kode ini punya akun ${owner.role === "orang_tua" ? "orang tua" : "anak"} lain, bukan pasangan yang cocok.`,
      };
    }

    const parentId = newUserRole === "orang_tua" ? newUserId : owner.id;
    const childId = newUserRole === "anak" ? newUserId : owner.id;

    const { error: linkError } = await supabase
      .from("users")
      .update({ linked_child_id: childId })
      .eq("id", parentId);

    if (linkError) {
      return {
        success: false,
        message: "Gagal menyambungkan akun. Coba lagi.",
      };
    }

    await supabase
      .from("invite_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", invite.id);

    return { success: true };
  }

  // ---------- Layar "kode berhasil dibuat, silakan share" ----------
  if (generatedCode) {
    return (
      <div
        className="min-h-screen w-full flex items-center justify-center px-4"
        style={{ background: C.bg, fontFamily: "'Inter', sans-serif" }}>
        <style>{FONT_IMPORT}</style>
        <div
          className="w-full max-w-[400px] rounded-[28px] px-7 py-9 text-center"
          style={{
            background: "#FFFFFF",
            boxShadow: "0 24px 60px -20px rgba(70,63,92,0.22)",
          }}>
          <p
            className="text-[11px] tracking-[0.2em] uppercase font-semibold mb-1"
            style={{ color: C.lavender }}>
            Akun berhasil dibuat
          </p>
          <h1
            style={{ fontFamily: "'Fraunces', serif", color: C.ink }}
            className="text-[22px] font-semibold mb-3">
            Bagikan kode ini
          </h1>
          <p className="text-[13px] mb-6" style={{ color: C.inkFaint }}>
            Kasih kode ini ke {role === "anak" ? "orang tua" : "anak"} kamu. Pas
            mereka daftar dan masukin kode ini, akun kalian otomatis kesambung.
            Berlaku 24 jam.
          </p>

          <div
            className="text-[32px] font-semibold tracking-[0.3em] py-4 rounded-2xl mb-3"
            style={{
              background: "#463F5C08",
              color: C.ink,
              fontFamily: "'Fraunces', serif",
            }}>
            {generatedCode}
          </div>

          <button
            type="button"
            onClick={handleCopyCode}
            className="w-full py-2.5 rounded-2xl font-semibold text-[13px] mb-6 transition-colors"
            style={{
              background: copied ? "#3F9E7C1F" : "#463F5C0d",
              color: copied ? C.mintDeep : C.ink,
            }}>
            {copied ? "✓ Kode disalin" : "Salin Kode"}
          </button>

          <button
            type="button"
            onClick={() => onSignUpSuccess?.(pendingUser)}
            className="w-full py-3.5 rounded-2xl font-semibold text-[14px] transition-transform active:scale-[0.98]"
            style={{
              background: `linear-gradient(135deg, ${C.lavender}, ${C.skyDeep})`,
              color: "#FFFFFF",
              boxShadow: "0 16px 32px -16px rgba(139,114,196,0.6)",
            }}>
            Lanjut ke aplikasi
          </button>
        </div>
      </div>
    );
  }

  // ---------- Form sign up ----------
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-4 py-10"
      style={{ background: C.bg, fontFamily: "'Inter', sans-serif" }}>
      <style>{FONT_IMPORT}</style>

      <form
        onSubmit={handleSignUp}
        className="w-full max-w-[400px] rounded-[28px] px-6 sm:px-7 py-9"
        style={{
          background: "#FFFFFF",
          boxShadow: "0 24px 60px -20px rgba(70,63,92,0.22)",
        }}>
        <p
          className="text-center text-[11px] tracking-[0.2em] uppercase mb-1 font-semibold"
          style={{ color: C.lavender }}>
          Gabung TAS
        </p>
        <h1
          style={{ fontFamily: "'Fraunces', serif", color: C.ink }}
          className="text-center text-[24px] font-semibold mb-6">
          Buat Akun Baru
        </h1>

        {/* Pilih role */}
        <label
          className="text-[11px] uppercase tracking-wide font-medium"
          style={{ color: C.inkFaint }}>
          Daftar sebagai
        </label>
        <div className="grid grid-cols-2 gap-2 mt-1.5 mb-4">
          {[
            { key: "anak", label: "Anak" },
            { key: "orang_tua", label: "Orang Tua" },
          ].map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setRole(opt.key)}
              className="py-3 rounded-2xl text-[13.5px] font-semibold border-[1.5px] transition-colors"
              style={{
                background: role === opt.key ? C.lavender : "#463F5C08",
                color: role === opt.key ? "#FFFFFF" : C.ink,
                borderColor: role === opt.key ? C.lavender : "#463F5C1F",
              }}>
              {opt.label}
            </button>
          ))}
        </div>

        {/* Nama Lengkap */}
        <label
          className="text-[11px] uppercase tracking-wide font-medium"
          style={{ color: C.inkFaint }}>
          Nama Lengkap
        </label>
        <input
          type="text"
          value={namaLengkap}
          onChange={(e) => setNamaLengkap(e.target.value)}
          required
          placeholder="nama lengkap kamu"
          className="w-full mt-1.5 mb-4 px-3.5 py-3 rounded-2xl text-[15px] outline-none border-[1.5px] transition-shadow focus:ring-4 focus:ring-[#8B72C42A]"
          style={{
            background: "#463F5C08",
            color: C.ink,
            borderColor: "#463F5C1F",
          }}
        />

        {/* Username */}
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
          placeholder="username kamu"
          className="w-full mt-1.5 mb-4 px-3.5 py-3 rounded-2xl text-[15px] outline-none border-[1.5px] transition-shadow focus:ring-4 focus:ring-[#8B72C42A]"
          style={{
            background: "#463F5C08",
            color: C.ink,
            borderColor: "#463F5C1F",
          }}
        />

        {/* Password */}
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
            placeholder="••••••••"
            className="w-full pl-3.5 pr-12 py-3 rounded-2xl text-[15px] outline-none border-[1.5px] transition-shadow focus:ring-4 focus:ring-[#8B72C42A]"
            style={{
              background: "#463F5C08",
              color: C.ink,
              borderColor: "#463F5C1F",
            }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
            style={{ color: C.inkFaint, "--tw-ring-color": C.lavender }}
            aria-label={
              showPassword ? "Sembunyikan password" : "Tampilkan password"
            }>
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>

        {/* Konfirmasi password */}
        <label
          className="text-[11px] uppercase tracking-wide font-medium"
          style={{ color: C.inkFaint }}>
          Konfirmasi Password
        </label>
        <div className="relative mt-1.5 mb-4">
          <input
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            placeholder="••••••••"
            className="w-full pl-3.5 pr-12 py-3 rounded-2xl text-[15px] outline-none border-[1.5px] transition-shadow focus:ring-4 focus:ring-[#8B72C42A]"
            style={{
              background: "#463F5C08",
              color: C.ink,
              borderColor: "#463F5C1F",
            }}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((v) => !v)}
            tabIndex={-1}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
            style={{ color: C.inkFaint, "--tw-ring-color": C.lavender }}
            aria-label={
              showConfirmPassword
                ? "Sembunyikan password"
                : "Tampilkan password"
            }>
            {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>

        {/* Kode undangan (opsional) */}
        <label
          className="text-[11px] uppercase tracking-wide font-medium"
          style={{ color: C.inkFaint }}>
          Kode Undangan (opsional)
        </label>
        <input
          type="text"
          value={inviteCodeInput}
          onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
          placeholder="Sudah punya kode dari orang tua/anak?"
          maxLength={6}
          className="w-full mt-1.5 mb-1 px-3.5 py-3 rounded-2xl text-[15px] tracking-[0.15em] outline-none border-[1.5px] transition-shadow focus:ring-4 focus:ring-[#8B72C42A]"
          style={{
            background: "#463F5C08",
            color: C.ink,
            borderColor: "#463F5C1F",
          }}
        />
        <p className="text-[11.5px] mb-5" style={{ color: C.inkFaint }}>
          Kosongkan kalau belum punya. Nanti kamu dapet kode buat dibagikan.
        </p>

        {error && (
          <div
            className="flex items-center gap-2 text-[12px] mb-4 px-3.5 py-2.5 rounded-xl font-medium"
            style={{ background: "#D9607A14", color: C.roseDeep }}>
            <span className="flex-shrink-0">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-2xl font-semibold text-[14px] disabled:opacity-50 transition-transform active:scale-[0.98]"
          style={{
            background: `linear-gradient(135deg, ${C.lavender}, ${C.skyDeep})`,
            color: "#FFFFFF",
            boxShadow: "0 16px 32px -16px rgba(139,114,196,0.6)",
          }}>
          {loading ? "Memproses..." : "Daftar"}
        </button>

        <button
          type="button"
          onClick={onBackToLogin}
          className="w-full text-center mt-5 text-[12.5px] font-medium"
          style={{ color: C.lavender }}>
          Sudah punya akun? Masuk
        </button>
      </form>
    </div>
  );
}

// ============================================================
// Ikon & elemen dekoratif bersama (dipakai Login & SignUp)
// ============================================================
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

function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function TasBadge() {
  // Ikon tas ransel simpel -- representasi "TAS" sebagai wadah semua
  // urusan harian, bukan ikon duit lagi kayak CoinBadge sebelumnya.
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient
          id="tasBadgeGradient"
          x1="6"
          y1="6"
          x2="58"
          y2="58"
          gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={C.lavender} />
          <stop offset="100%" stopColor={C.skyDeep} />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="31" fill="#FFFFFF" />
      <circle cx="32" cy="32" r="29" fill={C.lavenderSoft} opacity="0.25" />
      <circle cx="32" cy="32" r="21" fill="url(#tasBadgeGradient)" />
      <path
        d="M26 27v-3a6 6 0 0 1 12 0v3"
        stroke="#FFFFFF"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
      <rect
        x="21"
        y="27"
        width="22"
        height="17"
        rx="4"
        fill="#FFFFFF"
        opacity="0.95"
      />
      <rect x="30" y="33" width="4" height="3.2" rx="1" fill={C.lavender} />
    </svg>
  );
}

function FloatingDoodles() {
  // Small scattered doodles across the hero banner. Dulu isinya cuma koin
  // "Rp" (Wallet-only). Sekarang mix 3 ikon tipis yang masing-masing
  // mewakili satu modul appnya -- dompet, kalender, checklist -- biar
  // dari hero langsung kebaca ini hub, bukan cuma soal duit.
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 400 260"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      stroke="#FFFFFF"
      strokeLinecap="round"
      strokeLinejoin="round">
      {/* Dompet -- Wallet */}
      <g opacity="0.55" strokeWidth="1.8">
        <rect x="336" y="34" width="30" height="22" rx="4" />
        <path d="M336 42h30" />
        <circle cx="356" cy="46" r="2.2" fill="#FFFFFF" stroke="none" />
      </g>

      {/* Kalender -- Jadwal */}
      <g opacity="0.5" strokeWidth="1.8">
        <rect x="18" y="26" width="26" height="24" rx="4" />
        <path d="M18 34h26" />
        <path d="M25 22v8M37 22v8" />
      </g>

      {/* Checklist -- Tugas */}
      <g opacity="0.5" strokeWidth="1.8">
        <path d="M296 96 L302 102 L314 88" />
        <circle cx="303" cy="94" r="17" opacity="0.6" />
      </g>

      <path
        d="M28 100 L30 106 L36 108 L30 110 L28 116 L26 110 L20 108 L26 106 Z"
        fill="#FFFFFF"
        stroke="none"
        opacity="0.45"
      />
    </svg>
  );
}
