import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { C, FONT_IMPORT } from "../lib/theme";
import { capitalize } from "../lib/format";
import { Card } from "../components/ui";
import {
  HARI_LIST,
  statusMeta,
  nextStatus,
  prioritasMeta,
  deadlineLabel,
  formatDeadline,
  daysUntil,
  URGENT_DAYS_LIMIT,
} from "./akademik/constants";

// Hari ini dalam format HARI_LIST ("Senin".."Minggu"). getDay() JS
// mulai dari Minggu=0, jadi digeser +6 mod 7 biar Senin=0.
function todayHari() {
  return HARI_LIST[(new Date().getDay() + 6) % 7];
}

export default function HomePage({ user }) {
  const name = capitalize(user?.nama_lengkap) || "Kamu";
  const isParent = user?.role === "orang_tua";

  // Akademik (jadwal/tugas) & Wallet dua-duanya diarahin ke data ANAK
  // kalau yang login orang tua -- sama kayak pola ParentDashboard.
  // Kalau anak yang login, targetId = dirinya sendiri.
  const targetId = isParent ? user.linked_child_id : user.id;
  const targetLinked = isParent ? Boolean(user.linked_child_id) : true;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [childName, setChildName] = useState("");
  const [childProdi, setChildProdi] = useState("");

  // Jadwal
  const [jadwalHariIni, setJadwalHariIni] = useState([]);

  // Tugas
  const [tugasList, setTugasList] = useState([]);
  const [updatingTugasId, setUpdatingTugasId] = useState(null);

  // Status hubung ke akun ortu -- cuma relevan buat sisi ANAK.
  // Ortu punya cek koneksi versi sendiri lewat `targetLinked` di atas.
  const [isLinked, setIsLinked] = useState(null); // null = belum dicek
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [inviteCode, setInviteCode] = useState(null);
  const [inviteExpiresAt, setInviteExpiresAt] = useState(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);

  async function handleCopyInviteCode() {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      // Clipboard API gagal -- diemin aja, user masih bisa select manual.
    }
  }

  // Anak gak punya kolom "linked" di row-nya sendiri -- status link
  // ditentuin dari SISI ORTU: ada gak akun orang_tua yang
  // linked_child_id-nya nunjuk ke id anak ini. Bisa lebih dari satu
  // orang tua (misal ayah & ibu), makanya query-nya gak pakai
  // .single()/.maybeSingle() -- cukup cek apakah hasilnya kosong atau ada.
  async function checkLinkStatus() {
    const { data } = await supabase
      .from("users")
      .select("id")
      .eq("role", "orang_tua")
      .eq("linked_child_id", user.id);

    const linked = (data?.length || 0) > 0;
    setIsLinked(linked);

    if (!linked) {
      loadActiveInviteCode();
    }
  }

  async function loadActiveInviteCode() {
    const { data } = await supabase
      .from("invite_codes")
      .select("code, expires_at")
      .eq("user_id", user.id)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setInviteCode(data.code);
      setInviteExpiresAt(data.expires_at);
    }
  }

  async function generateInviteCode() {
    setGeneratingCode(true);
    setCodeError("");

    // Invalidate semua kode lama yang belum kepake punya user ini dulu,
    // biar cuma ada 1 kode aktif setiap saat.
    await supabase
      .from("invite_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("used_at", null);

    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { error: codeInsertError } = await supabase
      .from("invite_codes")
      .insert({ code, user_id: user.id, expires_at: expiresAt });

    setGeneratingCode(false);

    if (codeInsertError) {
      setCodeError("Gagal membuat kode. Coba lagi.");
      return;
    }

    setInviteCode(code);
    setInviteExpiresAt(expiresAt);
  }

  useEffect(() => {
    if (targetLinked) {
      loadAll();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isParent) checkLinkStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadChildName(), loadJadwal(), loadTugas()]);
    } catch (err) {
      setError("Gagal memuat data. Cek koneksi kamu, terus coba lagi.");
    }
    setLoading(false);
  }

  async function loadChildName() {
    if (!isParent) return;
    const { data } = await supabase
      .from("users")
      .select("nama_lengkap, username, prodi")
      .eq("id", targetId)
      .single();
    if (data) {
      setChildName(data.nama_lengkap || data.username);
      setChildProdi(data.prodi || "");
    }
  }

  async function loadJadwal() {
    const { data, error } = await supabase
      .from("jadwal")
      .select("*, mata_kuliah(nama, dosen, warna)")
      .eq("user_id", targetId)
      .eq("hari", todayHari())
      .order("jam_mulai", { ascending: true });
    if (error) throw error;
    setJadwalHariIni(data || []);
  }

  async function loadTugas() {
    const { data, error } = await supabase
      .from("tugas")
      .select("*, mata_kuliah(nama, warna)")
      .eq("user_id", targetId)
      .neq("status", "selesai")
      .order("deadline", { ascending: true });
    if (error) throw error;
    setTugasList(data || []);
  }

  async function handleToggleStatus(item) {
    // Orang tua cuma liat, bukan yang ngerjain -- toggle status dari
    // Home cuma aktif buat anak (ngerjain tugasnya sendiri).
    if (isParent) return;

    setUpdatingTugasId(item.id);
    const newStatus = nextStatus(item.status);
    const { error } = await supabase
      .from("tugas")
      .update({ status: newStatus })
      .eq("id", item.id)
      .eq("user_id", targetId);
    setUpdatingTugasId(null);
    if (!error) {
      if (newStatus === "selesai") {
        setTugasList((prev) => prev.filter((t) => t.id !== item.id));
      } else {
        setTugasList((prev) =>
          prev.map((t) => (t.id === item.id ? { ...t, status: newStatus } : t)),
        );
      }
    }
  }

  const tugasUrgent = useMemo(
    () => tugasList.filter((t) => daysUntil(t.deadline) <= URGENT_DAYS_LIMIT),
    [tugasList],
  );

  // Anak nampilin prodi dirinya sendiri (dari kolom users.prodi),
  // ortu nampilin prodi anaknya (di-fetch bareng nama pas loadChildName).
  const prodi = isParent ? childProdi : user?.prodi;

  if (!targetLinked) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <style>{FONT_IMPORT}</style>
        <p
          className="text-[11px] tracking-[0.2em] uppercase font-semibold mb-1"
          style={{ color: C.lavender }}>
          Beranda
        </p>
        <h1
          style={{ fontFamily: "'Fraunces', serif", color: C.ink }}
          className="text-[24px] font-semibold mb-4">
          Halo, {name} 👋
        </h1>
        <Card accent={C.skyDeep} tint={`${C.sky}22`} border>
          <p style={{ color: C.ink }}>
            Akun ini belum terhubung ke akun anak. Hubungi admin untuk mengatur{" "}
            <code>linked_child_id</code>.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-20 lg:pb-10"
      style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{FONT_IMPORT}</style>

      <p
        className="text-[11px] tracking-[0.2em] uppercase font-semibold mb-1"
        style={{ color: C.lavender }}>
        Beranda
      </p>
      <h1
        style={{ fontFamily: "'Fraunces', serif", color: C.ink }}
        className={`text-[24px] sm:text-[26px] font-semibold ${
          prodi ? "mb-0.5" : "mb-6 sm:mb-8"
        }`}>
        Halo, {name} 👋
      </h1>
      {prodi && (
        <p
          className="text-[12.5px] sm:text-[13.5px] font-semibold mb-6 sm:mb-8"
          style={{ color: C.inkSoft }}>
          {prodi}
        </p>
      )}

      {!isParent && isLinked === false && (
        <div
          className="flex items-center justify-between gap-3 mb-5 sm:mb-6 px-4 py-3 rounded-2xl"
          style={{ background: "#F6C4531F" }}>
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex-shrink-0">👀</span>
            <p
              className="text-[12.5px] font-semibold min-w-0"
              style={{ color: C.ink }}>
              Belum Terhubung Ke Akun Orang Tua.
            </p>
          </div>
          <button
            onClick={() => setShowLinkModal(true)}
            className="text-[12px] font-semibold px-3 py-1.5 rounded-xl flex-shrink-0"
            style={{ background: C.amberDeep, color: "#FFFFFF" }}>
            Hubungkan
          </button>
        </div>
      )}

      {!loading && error && (
        <div
          className="flex items-center gap-2.5 rounded-2xl px-4 py-3 mb-4"
          style={{ background: "#D9607A1F", border: "1.5px solid #D9607A55" }}>
          <span className="text-[18px] flex-shrink-0">⚠️</span>
          <p
            className="text-[12.5px] sm:text-[13px] font-semibold flex-1 min-w-0"
            style={{ color: C.roseDeep }}>
            {error}
          </p>
          <button
            onClick={loadAll}
            className="flex-shrink-0 min-h-[40px] px-3.5 rounded-full text-[12px] font-semibold"
            style={{ color: C.roseDeep, background: "#FFFFFF" }}>
            Coba lagi
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-4" aria-live="polite" aria-busy="true">
          <div
            className="rounded-[28px] h-[132px] sm:h-[148px] animate-pulse"
            style={{ background: "#463F5C14" }}
          />
          <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-4">
            <div
              className="rounded-[28px] h-[190px] animate-pulse"
              style={{ background: "#463F5C0F" }}
            />
            <div
              className="rounded-[28px] h-[190px] animate-pulse"
              style={{ background: "#463F5C0F" }}
            />
          </div>
          <span className="sr-only">Memuat data...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Jadwal & Tugas: numpuk 1 kolom di HP/tablet portrait, 2 kolom mulai laptop */}
          <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-4 lg:items-start">
            {/* Card Jadwal Hari Ini -- pastel lavender biar senada sama accent-nya */}
            <Card
              title={
                isParent
                  ? `Jadwal ${capitalize(childName) || "Anak"} Hari Ini`
                  : "Jadwal Hari Ini"
              }
              sub={todayHari()}
              accent={C.lavender}
              tint={`${C.lavender}20`}
              border>
              {jadwalHariIni.length === 0 ? (
                <p className="text-[12.5px]" style={{ color: C.inkFaint }}>
                  {isParent
                    ? "Gak ada jadwal kuliah hari ini."
                    : "Gak ada jadwal hari ini, healing dulu! 😌"}
                </p>
              ) : (
                <div className="space-y-2.5">
                  {jadwalHariIni.map((j) => {
                    const mk = j.mata_kuliah || {};
                    return (
                      <div
                        key={j.id}
                        className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl"
                        style={{ background: "#FFFFFF9E" }}>
                        <div
                          className="w-1.5 h-9 rounded-full flex-shrink-0"
                          style={{ background: mk.warna || C.lavender }}
                        />
                        <div className="min-w-0 flex-1">
                          <p
                            className="text-[13.5px] font-semibold truncate"
                            style={{ color: C.ink }}>
                            {mk.nama || "Tanpa nama"}
                          </p>
                          <p
                            className="text-[11.5px]"
                            style={{ color: C.inkFaint }}>
                            {j.jam_mulai?.slice(0, 5)}–
                            {j.jam_selesai?.slice(0, 5)}
                            {j.ruangan ? ` · ${j.ruangan}` : ""}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {!isParent && (
                <Link
                  to="/akademik/jadwal"
                  className="inline-block mt-3.5 -mx-1 px-1 py-2 text-[12px] font-semibold"
                  style={{ color: C.lavender }}>
                  Lihat semua jadwal →
                </Link>
              )}
            </Card>

            {/* Card Tugas Mendekati Deadline -- pastel rose biar senada sama accent-nya */}
            <Card
              title={
                isParent
                  ? `Tugas ${capitalize(childName) || "Anak"} Mendekati Deadline`
                  : "Tugas Mendekati Deadline"
              }
              sub={`${URGENT_DAYS_LIMIT} hari ke depan`}
              accent={C.roseDeep}
              tint={`${C.rose}22`}
              border>
              {tugasUrgent.length === 0 ? (
                <p className="text-[12.5px]" style={{ color: C.inkFaint }}>
                  Gak ada tugas yang mendesak. Aman! ✅
                </p>
              ) : (
                <div className="space-y-2">
                  {tugasUrgent.map((item) => {
                    const meta = statusMeta(item.status);
                    const prio = prioritasMeta(item.prioritas);
                    const overdue = daysUntil(item.deadline) < 0;
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl"
                        style={{
                          background: overdue ? "#F4A6B733" : "#FFFFFF9E",
                        }}>
                        <button
                          onClick={() => handleToggleStatus(item)}
                          disabled={updatingTugasId === item.id || isParent}
                          aria-label="Ubah status"
                          className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-[16px] active:scale-95 transition-transform disabled:opacity-50"
                          style={{
                            background: meta.bg,
                            cursor: isParent ? "default" : "pointer",
                          }}>
                          {meta.icon}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p
                            className="text-[13.5px] font-semibold truncate"
                            style={{ color: C.ink }}>
                            {item.judul}
                          </p>
                          <div className="flex items-center flex-wrap gap-1.5 mt-1">
                            <span
                              className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full"
                              style={{
                                background: prio.bg,
                                color: prio.color,
                              }}>
                              {prio.label}
                            </span>
                            <span
                              className="text-[10.5px] font-semibold"
                              style={{
                                color: overdue ? C.roseDeep : C.inkFaint,
                              }}>
                              {deadlineLabel(item.deadline)} ·{" "}
                              {formatDeadline(item.deadline)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {!isParent && (
                <Link
                  to="/akademik/tugas"
                  className="inline-block mt-3.5 -mx-1 px-1 py-2 text-[12px] font-semibold"
                  style={{ color: C.roseDeep }}>
                  Lihat semua tugas →
                </Link>
              )}
            </Card>
          </div>
        </div>
      )}

      {showLinkModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 px-4"
          style={{ background: "rgba(70,63,92,0.4)" }}
          onClick={() => setShowLinkModal(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-sm rounded-[28px] p-6 sm:p-7"
            style={{
              background: "#FFFFFF",
              boxShadow: "0 24px 56px -20px rgba(70,63,92,0.35)",
            }}>
            <p
              className="text-[11px] tracking-[0.2em] uppercase font-semibold mb-1"
              style={{ color: C.lavender }}>
              Belum Terhubung
            </p>
            <h3
              style={{ fontFamily: "'Fraunces', serif", color: C.ink }}
              className="text-[18px] font-semibold mb-2">
              Sambungkan ke Orang Tua
            </h3>
            <p className="text-[13px] mb-5" style={{ color: C.inkFaint }}>
              Buat kode undangan di bawah, terus kasih kodenya ke orang tua kamu
              supaya dia bisa masukin pas login/daftar.
            </p>

            {inviteCode ? (
              <>
                <div
                  className="text-center text-[26px] font-semibold tracking-[0.3em] py-4 rounded-2xl mb-3"
                  style={{
                    background: "#463F5C08",
                    color: C.ink,
                    fontFamily: "'Fraunces', serif",
                  }}>
                  {inviteCode}
                </div>
                <button
                  type="button"
                  onClick={handleCopyInviteCode}
                  className="w-full py-2.5 rounded-2xl font-semibold text-[13px] mb-3 transition-colors"
                  style={{
                    background: codeCopied ? "#3F9E7C1F" : "#463F5C0d",
                    color: codeCopied ? C.mintDeep : C.ink,
                  }}>
                  {codeCopied ? "✓ Kode disalin" : "Salin Kode"}
                </button>
                {inviteExpiresAt && (
                  <p
                    className="text-center text-[11.5px] mb-5"
                    style={{ color: C.inkFaint }}>
                    Berlaku sampai{" "}
                    {new Date(inviteExpiresAt).toLocaleString("id-ID", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </>
            ) : (
              <p className="text-[12.5px] mb-5" style={{ color: C.inkFaint }}>
                Belum ada kode aktif.
              </p>
            )}

            {codeError && (
              <div
                className="flex items-center gap-2 text-[12px] mb-4 px-3.5 py-2.5 rounded-xl font-medium"
                style={{ background: "#D9607A14", color: C.roseDeep }}>
                <span className="flex-shrink-0">⚠️</span>
                <span>{codeError}</span>
              </div>
            )}

            <button
              onClick={generateInviteCode}
              disabled={generatingCode}
              className="w-full py-3 rounded-2xl text-sm font-semibold disabled:opacity-50"
              style={{
                background: `linear-gradient(135deg, ${C.lavender}, ${C.skyDeep})`,
                color: "#fff",
              }}>
              {generatingCode
                ? "Memproses..."
                : inviteCode
                  ? "Buat Kode Baru"
                  : "Buat Kode Undangan"}
            </button>

            <button
              onClick={() => setShowLinkModal(false)}
              className="w-full mt-2.5 py-3 rounded-2xl text-[13px] font-semibold"
              style={{ background: "#463F5C0f", color: C.ink }}>
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
