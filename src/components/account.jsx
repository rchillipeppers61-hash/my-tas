import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { C } from "../lib/theme";
import { PasswordField } from "./ui";

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

// ============================================================
// AccountModal — isi modal "Akun" di Layout.jsx. Nampilin profil
// (nama bisa diedit, role, username, status link ke ortu/anak),
// terus tombol-tombol aksi (ganti password) di bawahnya.
// ============================================================
export function AccountModal({
  user,
  onClose,
  onOpenChangePassword,
  onOpenResetChildPassword,
}) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState("");

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadProfile() {
    setLoading(true);

    const { data: me } = await supabase
      .from("users")
      .select("id, nama_lengkap, username, role, linked_child_id")
      .eq("id", user.id)
      .single();

    if (me) {
      setProfile(me);
      setNameInput(me.nama_lengkap || "");
    }

    setLoading(false);
  }

  function startEditing() {
    setNameInput(profile?.nama_lengkap || "");
    setNameError("");
    setEditing(true);
  }

  async function handleSaveName() {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setNameError("Nama gak boleh kosong.");
      return;
    }
    setSavingName(true);
    setNameError("");

    const { data, error } = await supabase
      .from("users")
      .update({ nama_lengkap: trimmed })
      .eq("id", user.id)
      .select()
      .single();

    setSavingName(false);

    if (error || !data) {
      setNameError("Gagal simpan nama. Coba lagi.");
      return;
    }

    setProfile(data);
    setEditing(false);
  }

  return (
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center z-50 px-4 pb-4 sm:pb-4"
      style={{ background: "rgba(70,63,92,0.4)" }}
      onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-sm rounded-[28px] p-6 sm:p-7"
        style={{
          background: "#FFFFFF",
          boxShadow: "0 24px 56px -20px rgba(70,63,92,0.35)",
        }}>
        {loading ? (
          <p
            className="text-[13px] py-6 text-center"
            style={{ color: C.inkFaint }}>
            Memuat...
          </p>
        ) : (
          <>
            {/* Profil */}
            <div className="flex items-center gap-3.5 mb-5">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center font-semibold text-[16px] flex-shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${C.lavender}, ${C.skyDeep})`,
                  color: "#FFFFFF",
                  fontFamily: "'Fraunces', serif",
                }}>
                {getInitials(profile?.nama_lengkap || profile?.username)}
              </div>
              <div className="min-w-0 flex-1">
                {editing ? (
                  <div>
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      autoFocus
                      className="w-full px-2.5 py-1.5 rounded-lg text-[14px] font-semibold outline-none border-[1.5px]"
                      style={{
                        color: C.ink,
                        borderColor: C.lavender,
                        fontFamily: "'Fraunces', serif",
                      }}
                    />
                    <div className="flex items-center gap-2 mt-1.5">
                      <button
                        onClick={handleSaveName}
                        disabled={savingName}
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-lg disabled:opacity-50"
                        style={{ background: C.lavender, color: "#FFFFFF" }}>
                        {savingName ? "Menyimpan..." : "Simpan"}
                      </button>
                      <button
                        onClick={() => setEditing(false)}
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-lg"
                        style={{ background: "#463F5C0f", color: C.ink }}>
                        Batal
                      </button>
                    </div>
                    {nameError && (
                      <p
                        className="text-[11px] mt-1"
                        style={{ color: C.roseDeep }}>
                        {nameError}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <p
                      style={{ fontFamily: "'Fraunces', serif", color: C.ink }}
                      className="text-[16px] font-semibold truncate">
                      {profile?.nama_lengkap || profile?.username}
                    </p>
                    <button
                      onClick={startEditing}
                      aria-label="Edit nama"
                      className="flex-shrink-0 text-[12px] opacity-70">
                      ✏️
                    </button>
                  </div>
                )}
              </div>
            </div>

            <h3
              style={{ fontFamily: "'Fraunces', serif", color: C.ink }}
              className="text-[14px] font-semibold mb-3">
              Keamanan
            </h3>
            <div className="space-y-2">
              <button
                onClick={onOpenChangePassword}
                className="w-full text-left px-4 py-3 rounded-2xl text-[13.5px] font-medium"
                style={{ background: "#463F5C0a", color: C.ink }}>
                Ganti Password Saya
              </button>
              {profile?.role === "orang_tua" && (
                <button
                  onClick={onOpenResetChildPassword}
                  className="w-full text-left px-4 py-3 rounded-2xl text-[13.5px] font-medium"
                  style={{ background: "#463F5C0a", color: C.ink }}>
                  Ganti Password Anak
                </button>
              )}
            </div>
          </>
        )}

        <button
          onClick={onClose}
          className="w-full mt-4 py-3 rounded-2xl text-[13px] font-semibold"
          style={{ background: "#463F5C0f", color: C.ink }}>
          Tutup
        </button>
      </div>
    </div>
  );
}

// ============================================================
// ChangePasswordModal — ganti password akun sendiri (anak / ortu).
// ============================================================
export function ChangePasswordModal({ user, onClose }) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (newPassword.length < 4) {
      setError("Password baru minimal 4 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password baru tidak cocok.");
      return;
    }
    if (newPassword === oldPassword) {
      setError("Password baru harus beda dari password lama.");
      return;
    }

    setLoading(true);

    // Verify the old password belongs to this user before allowing the change.
    const { data, error: checkError } = await supabase
      .from("users")
      .select("id")
      .eq("id", user.id)
      .eq("password", oldPassword)
      .single();

    if (checkError || !data) {
      setLoading(false);
      setError("Password lama salah.");
      return;
    }

    const { error: updateError } = await supabase
      .from("users")
      .update({ password: newPassword })
      .eq("id", user.id);

    setLoading(false);

    if (updateError) {
      setError("Gagal menyimpan password baru. Coba lagi.");
      return;
    }

    setSuccess(true);
  }

  return (
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center z-50 px-4 pb-4 sm:pb-4"
      style={{ background: "rgba(70,63,92,0.4)" }}
      onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-sm rounded-[28px] p-6 sm:p-7"
        style={{
          background: "#FFFFFF",
          boxShadow: "0 24px 56px -20px rgba(70,63,92,0.35)",
        }}>
        {success ? (
          <>
            <div
              className="w-14 h-14 mx-auto rounded-full flex items-center justify-center text-[26px] mb-4"
              style={{ background: "#8FD8BE33", color: C.mintDeep }}>
              ✓
            </div>
            <h3
              style={{ fontFamily: "'Fraunces', serif", color: C.ink }}
              className="text-[18px] font-semibold mb-1 text-center">
              Password berhasil diganti
            </h3>
            <p
              className="text-[12.5px] mb-5 text-center"
              style={{ color: C.inkFaint }}>
              Pakai password baru kamu di login berikutnya.
            </p>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl text-[13px] font-semibold"
              style={{
                background: `linear-gradient(135deg, ${C.lavender}, ${C.skyDeep})`,
                color: "#FFFFFF",
              }}>
              Selesai
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <h3
              style={{ fontFamily: "'Fraunces', serif", color: C.ink }}
              className="text-[18px] font-semibold mb-1">
              Ganti Password
            </h3>
            <p className="text-[12.5px] mb-4" style={{ color: C.inkFaint }}>
              Masukkan password lama, lalu password baru kamu.
            </p>

            <PasswordField
              label="Password Lama"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              autoComplete="current-password"
            />

            <PasswordField
              label="Password Baru"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />

            <PasswordField
              label="Konfirmasi Password Baru"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              className="mb-4"
            />

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
              className="w-full py-3.5 rounded-2xl font-semibold text-[14px] disabled:opacity-50"
              style={{
                background: `linear-gradient(135deg, ${C.lavender}, ${C.skyDeep})`,
                color: "#FFFFFF",
              }}>
              {loading ? "Menyimpan..." : "Simpan Password Baru"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full mt-2 py-3 rounded-2xl text-[13px] font-semibold"
              style={{ background: "#463F5C0f", color: C.ink }}>
              Batal
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ============================================================
// ResetChildPasswordModal — dipakai orang tua buat reset password
// akun anak.
// ============================================================
export function ResetChildPasswordModal({ user, childName, onClose }) {
  const [parentPassword, setParentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (newPassword.length < 4) {
      setError("Password baru minimal 4 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password baru tidak cocok.");
      return;
    }

    setLoading(true);

    // Confirm it's really the parent doing this before touching the child's account.
    const { data: parentCheck, error: parentError } = await supabase
      .from("users")
      .select("id")
      .eq("id", user.id)
      .eq("password", parentPassword)
      .single();

    if (parentError || !parentCheck) {
      setLoading(false);
      setError("Password kamu salah, coba lagi.");
      return;
    }

    const { error: updateError } = await supabase
      .from("users")
      .update({ password: newPassword })
      .eq("id", user.linked_child_id);

    setLoading(false);

    if (updateError) {
      setError("Gagal menyimpan password baru. Coba lagi.");
      return;
    }

    setSuccess(true);
  }

  return (
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center z-50 px-4 pb-4 sm:pb-4"
      style={{ background: "rgba(70,63,92,0.4)" }}
      onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-sm rounded-[28px] p-6 sm:p-7"
        style={{
          background: "#FFFFFF",
          boxShadow: "0 24px 56px -20px rgba(70,63,92,0.35)",
        }}>
        {success ? (
          <>
            <div
              className="w-14 h-14 mx-auto rounded-full flex items-center justify-center text-[26px] mb-4"
              style={{ background: "#8FD8BE33", color: C.mintDeep }}>
              ✓
            </div>
            <h3
              style={{ fontFamily: "'Fraunces', serif", color: C.ink }}
              className="text-[18px] font-semibold mb-1 text-center">
              Password {childName || "anak"} berhasil diganti
            </h3>
            <p
              className="text-[12.5px] mb-5 text-center"
              style={{ color: C.inkFaint }}>
              Kasih tau password barunya langsung ke dia ya, jangan lewat chat.
            </p>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl text-[13px] font-semibold"
              style={{
                background: `linear-gradient(135deg, ${C.lavender}, ${C.skyDeep})`,
                color: "#FFFFFF",
              }}>
              Selesai
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <h3
              style={{ fontFamily: "'Fraunces', serif", color: C.ink }}
              className="text-[18px] font-semibold mb-1">
              Ganti Password {childName || "Anak"}
            </h3>
            <p className="text-[12.5px] mb-4" style={{ color: C.inkFaint }}>
              Atur password baru untuk akun anak. Konfirmasi dengan password
              kamu sendiri.
            </p>

            <PasswordField
              label={`Password Baru untuk ${childName || "Anak"}`}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />

            <PasswordField
              label="Konfirmasi Password Baru"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />

            <PasswordField
              label="Password Kamu (konfirmasi)"
              value={parentPassword}
              onChange={(e) => setParentPassword(e.target.value)}
              autoComplete="current-password"
              className="mb-4"
            />

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
              className="w-full py-3.5 rounded-2xl font-semibold text-[14px] disabled:opacity-50"
              style={{
                background: `linear-gradient(135deg, ${C.lavender}, ${C.skyDeep})`,
                color: "#FFFFFF",
              }}>
              {loading ? "Menyimpan..." : "Simpan Password Baru"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full mt-2 py-3 rounded-2xl text-[13px] font-semibold"
              style={{ background: "#463F5C0f", color: C.ink }}>
              Batal
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
