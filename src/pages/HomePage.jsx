import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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

// Hari BESOK -- dipakai buat card "Persiapan Kuliah Besok". Sengaja
// dibikin terpisah dari todayHari() (bukan cuma +1 index) biar wrap
// Minggu -> Senin kehandle bener lewat modulo, bukan array out-of-range.
function tomorrowHari() {
  return HARI_LIST[(((new Date().getDay() + 6) % 7) + 1) % 7];
}

// Cocokin nama mata kuliah dari jadwal (`mata_kuliah.nama`) ke nama
// mata kuliah yang kesimpen di study_packs (`study_packs.mata_kuliah`,
// teks bebas -- BUKAN FK, lihat catatan di JadwalPage.jsx). Dibikin
// case-insensitive + trim biar sedikit toleran beda kapitalisasi,
// tapi tetep bisa meleset kalau namanya beda jauh pas diisi manual.
function normalizeNama(s) {
  return (s || "").trim().toLowerCase();
}

// Warna avatar konsisten per user (bukan random tiap render), diambil
// dari palet C yang udah ada. Hash sederhana dari string ID/nama.
function getAvatarColor(seed) {
  const palette = [C.lavender, C.skyDeep, C.roseDeep, C.mintDeep, C.amberDeep];
  const str = String(seed || "x");
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}

// 3 varian ilustrasi avatar flat, dipilih berdasarkan kolom `jenis_kelamin`
// di tabel users ("P" / "L"). Kalau kolom belum ada / kosong, fallback ke
// avatar netral -- bukan foto asli, representasi visual generik aja.
function AvatarIllustration({ color, jenisKelamin }) {
  if (jenisKelamin === "P") return <AvatarFemale color={color} />;
  if (jenisKelamin === "L") return <AvatarMale color={color} />;
  return <AvatarNeutral color={color} />;
}

function AvatarFemale({ color }) {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
      <defs>
        <linearGradient id="hijabShade" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0.8" />
        </linearGradient>
      </defs>

      {/* Hijab -- drape menutupi kepala & bahu, sedikit lebih membulat & lembut */}
      <path
        d="M32 4.5c-12 0-19.5 8.8-19.5 19.5v6.2c0 3.3 1.1 6.4 3.3 8.7l-5.6 12.6c-1.3 2.9 1 6 4.2 6h35.2c3.2 0 5.5-3.1 4.2-6l-5.6-12.6c2.2-2.3 3.3-5.4 3.3-8.7v-6.2c0-10.7-7.5-19.5-19.5-19.5z"
        fill="url(#hijabShade)"
      />

      {/* Highlight kain -- kesan lipatan lembut di sisi kiri hijab */}
      <path
        d="M16 22c1.5-7 6.5-12.5 13-13.8-6.5 2.6-10.5 9-10.8 17.3-0.2 5-0.1 9 0.3 12.4-2-2.2-2.8-5-2.8-8.1v-6c0-0.6 0.1-1.2 0.3-1.8z"
        fill="#FFFFFF"
        opacity="0.16"
      />

      {/* Wajah -- oval lebih halus & sedikit lebih ramping di dagu */}
      <path
        d="M32 17.2c7 0 12 5.7 12 13.3 0 8.2-5.2 14.8-12 14.8s-12-6.6-12-14.8c0-7.6 5-13.3 12-13.3z"
        fill="#F5D5B4"
      />

      {/* Bayangan lembut bawah dagu, kasih dimensi tanpa keliatan kotor */}
      <ellipse
        cx="32"
        cy="42.5"
        rx="7"
        ry="2.2"
        fill="#E8B98D"
        opacity="0.25"
      />

      {/* Poni/bagian hijab depan yang nutupin dahi, lengkung lebih natural */}
      <path
        d="M18.3 25.5c0.4-9 6-14.8 13.7-14.8s13.3 5.8 13.7 14.8c-3.5-2.7-8.4-4-13.7-4s-10.2 1.3-13.7 4z"
        fill={color}
      />

      {/* Blush pipi -- lebih soft & natural, gradasi halus */}
      <ellipse
        cx="23.5"
        cy="34.5"
        rx="3.1"
        ry="2"
        fill="#EFA894"
        opacity="0.4"
      />
      <ellipse
        cx="40.5"
        cy="34.5"
        rx="3.1"
        ry="2"
        fill="#EFA894"
        opacity="0.4"
      />

      {/* Alis -- lebih tipis & natural */}
      <path
        d="M23.5 27.3c1.4-1.1 3.6-1.1 4.9-0.3"
        stroke="#7A5A45"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M35.6 27c1.3-0.8 3.5-0.8 4.9 0.3"
        stroke="#7A5A45"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Mata -- bentuk almond kecil + highlight kilau + bulu mata */}
      <ellipse cx="26.5" cy="31.8" rx="1.9" ry="2.1" fill="#463F5C" />
      <ellipse cx="37.5" cy="31.8" rx="1.9" ry="2.1" fill="#463F5C" />
      <circle cx="27.1" cy="31.1" r="0.55" fill="#FFFFFF" />
      <circle cx="38.1" cy="31.1" r="0.55" fill="#FFFFFF" />
      <path
        d="M24.7 30.3c0.7-0.7 2.9-0.9 3.9-0.3"
        stroke="#463F5C"
        strokeWidth="0.9"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M35.4 30c1-0.6 3.2-0.4 3.9 0.3"
        stroke="#463F5C"
        strokeWidth="0.9"
        strokeLinecap="round"
        fill="none"
      />

      {/* Hidung -- sapuan sangat halus */}
      <path
        d="M32 33.5c-0.3 1.2-0.8 2-0.8 2.6 0 0.6 0.5 0.9 1 0.9"
        stroke="#DDA47C"
        strokeWidth="0.9"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />

      {/* Bibir -- senyum tipis, gradasi warna lembut */}
      <path
        d="M27.3 37.8c1.8 1.9 7.6 1.9 9.4 0"
        stroke="#C97C72"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function AvatarMale({ color }) {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
      <defs>
        <linearGradient id="collarShade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0.82" />
        </linearGradient>
      </defs>
      {/* Bahu / kerah baju */}
      <path
        d="M10 58c0-9 8-14 22-14s22 5 22 14v2H10z"
        fill="url(#collarShade)"
      />
      {/* Leher */}
      <rect x="27" y="38" width="10" height="8" rx="3" fill="#F3D0B0" />
      {/* Wajah */}
      <ellipse cx="32" cy="27" rx="12" ry="12.5" fill="#F3D0B0" />
      {/* Rambut pendek */}
      <path
        d="M20 26c-0.5-9 5-15.5 12-15.5s12.5 6.5 12 15.5c-1.3-1.6-2-4-2-6-2.8 1.7-6.4 2.6-10 2.6s-7.2-0.9-10-2.6c0 2-0.7 4.4-2 6z"
        fill={color}
      />
      {/* Alis */}
      <path
        d="M24.5 24.5c1.2-0.9 3-0.9 4.2-0.2"
        stroke="#6B4A38"
        strokeWidth="1.3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M35.3 24.3c1.2-0.7 3-0.7 4.2 0.2"
        stroke="#6B4A38"
        strokeWidth="1.3"
        strokeLinecap="round"
        fill="none"
      />
      {/* Mata */}
      <circle cx="26.5" cy="28" r="1.6" fill="#463F5C" />
      <circle cx="37.5" cy="28" r="1.6" fill="#463F5C" />
      {/* Senyum */}
      <path
        d="M27 34c1.6 2 8.4 2 10 0"
        stroke="#463F5C"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

// Avatar netral -- dipakai kalau `jenis_kelamin` belum keisi di database.
function AvatarNeutral({ color }) {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
      <path d="M32 34c8 0 24 4 24 16v6H8v-6c0-12 16-16 24-16z" fill={color} />
      <circle cx="32" cy="20" r="13" fill={color} opacity="0.85" />
    </svg>
  );
}

export default function HomePage({ user }) {
  const navigate = useNavigate();
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

  // Jadwal
  const [jadwalHariIni, setJadwalHariIni] = useState([]);

  // Tugas
  const [tugasList, setTugasList] = useState([]);
  const [updatingTugasId, setUpdatingTugasId] = useState(null);

  // Persiapan Kuliah Besok (Fase 6) -- daftar mata kuliah yang ada
  // jadwalnya BESOK, masing-masing ditandai udah/belum ada Study Pack.
  const [persiapanBesok, setPersiapanBesok] = useState([]);

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
      await Promise.all([
        loadChildName(),
        loadJadwal(),
        loadTugas(),
        loadPersiapanBesok(),
      ]);
    } catch (err) {
      setError("Gagal memuat data. Cek koneksi kamu, terus coba lagi.");
    }
    setLoading(false);
  }

  async function loadChildName() {
    if (!isParent) return;
    const { data } = await supabase
      .from("users")
      .select("nama_lengkap, username")
      .eq("id", targetId)
      .single();
    if (data) {
      setChildName(data.nama_lengkap || data.username);
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

  // Fase 6: ambil jadwal BESOK, terus tandain tiap mata kuliah udah
  // punya Study Pack atau belum. study_packs gak punya mata_kuliah_id
  // (nama disimpen sebagai teks bebas -- lihat catatan di JadwalPage.jsx
  // & index.ts), jadi matching-nya lewat nama, case-insensitive + trim
  // biar sedikit toleran beda kapitalisasi antara Jadwal & input manual.
  async function loadPersiapanBesok() {
    const besok = tomorrowHari();

    const { data: jadwalBesok, error: jadwalError } = await supabase
      .from("jadwal")
      .select("id, jam_mulai, mata_kuliah(id, nama, warna)")
      .eq("user_id", targetId)
      .eq("hari", besok)
      .order("jam_mulai", { ascending: true });
    if (jadwalError) throw jadwalError;

    // Dedupe per mata kuliah -- kalau 1 matkul kebetulan ada 2 jadwal
    // di hari yang sama (kelas + praktikum misalnya), cukup 1 baris
    // di card ini, bukan dobel.
    const seen = new Set();
    const matkulBesok = [];
    for (const j of jadwalBesok || []) {
      const mk = j.mata_kuliah;
      if (!mk?.nama) continue;
      const key = normalizeNama(mk.nama);
      if (seen.has(key)) continue;
      seen.add(key);
      matkulBesok.push({
        id: mk.id,
        nama: mk.nama,
        warna: mk.warna,
        jamMulai: j.jam_mulai,
      });
    }

    if (matkulBesok.length === 0) {
      setPersiapanBesok([]);
      return;
    }

    const { data: packs, error: packsError } = await supabase
      .from("study_packs")
      .select("mata_kuliah")
      .eq("user_id", targetId);
    if (packsError) throw packsError;

    const sudahDipersiapkan = new Set(
      (packs || []).map((p) => normalizeNama(p.mata_kuliah)),
    );

    setPersiapanBesok(
      matkulBesok.map((mk) => ({
        ...mk,
        sudah: sudahDipersiapkan.has(normalizeNama(mk.nama)),
      })),
    );
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

  function handleMulaiPersiapan(mk) {
    navigate("/akademik/persiapan/tambah", {
      state: { mataKuliah: { id: mk.id, nama: mk.nama } },
    });
  }

  const tugasUrgent = useMemo(
    () => tugasList.filter((t) => daysUntil(t.deadline) <= URGENT_DAYS_LIMIT),
    [tugasList],
  );

  // Baris di bawah nama selalu nampilin kolom `prodi` milik akun yang
  // login sendiri -- anak nampilin prodi kuliahnya, orang tua nampilin
  // label relasi yang diisi di kolom prodi (misal "Ayah Aghnia"). Bukan
  // prodi anaknya, karena itu bukan makna kolom ini buat akun ortu.
  const prodi = user?.prodi;

  if (!targetLinked) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <style>{FONT_IMPORT}</style>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            <p
              className="text-[11px] tracking-[0.2em] uppercase font-semibold mb-1"
              style={{ color: C.lavender }}>
              Selamat Datang
            </p>
            <h1
              style={{ fontFamily: "'Fraunces', serif", color: C.ink }}
              className="text-[22px] font-semibold">
              Halo, {name} 👋
            </h1>
          </div>
          <div
            className="flex-shrink-0 w-20 h-20 rounded-full overflow-hidden ring-2 ring-white shadow-sm"
            style={{ background: "#F3D0B0" }}
            aria-label={`Foto profil ${name}`}>
            <AvatarIllustration
              color={getAvatarColor(user?.id || name)}
              jenisKelamin={user?.jenis_kelamin}
            />
          </div>
        </div>
        <Card accent={C.skyDeep} tint={`${C.sky}22`} border>
          <p style={{ color: C.ink }}>
            Akun Ini Belum Terhubung Ke Akun Anak. Hubungi Admin Untuk Mengatur{" "}
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

      <div className="flex items-start justify-between gap-4 mb-0">
        <div className="min-w-0">
          <p
            className="text-[14px] tracking-[0.2em] uppercase font-semibold mb-1"
            style={{ color: C.lavender }}>
            Selamat Datang
          </p>
          <h1
            style={{ fontFamily: "'Inter', serif", color: C.ink }}
            className={`text-[20px] sm:text-[26px] font-semibold ${
              prodi ? "mb-0.5" : ""
            }`}>
            Halo, {name} 👋
          </h1>
          {prodi && (
            <p
              className="text-[15px] sm:text-[13.5px] font-semibold"
              style={{ color: C.inkSoft }}>
              {prodi}
            </p>
          )}
        </div>

        <div
          className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden ring-2 ring-white shadow-sm"
          style={{ background: "#F3D0B0" }}
          aria-label={`Foto profil ${name}`}>
          <AvatarIllustration
            color={getAvatarColor(user?.id || name)}
            jenisKelamin={user?.jenis_kelamin}
          />
        </div>
      </div>
      <div className="mb-6 sm:mb-8" />

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

          {/* Card Persiapan Kuliah Besok (Fase 6) -- pastel mint, senada
              sama accent "Persiapan Kuliah" di AkademikPage.jsx. Cuma
              muncul kalau BESOK ada jadwal kuliah -- gak maksa nampilin
              state kosong yang gak berguna. */}
          {persiapanBesok.length > 0 && (
            <Card
              title={
                isParent
                  ? `Persiapan Kuliah ${capitalize(childName) || "Anak"} Besok`
                  : "Persiapan Kuliah Besok"
              }
              sub={tomorrowHari()}
              accent={C.mintDeep}
              tint="#8FD8BE22"
              border>
              <div className="space-y-2.5">
                {persiapanBesok.map((mk) => (
                  <div
                    key={mk.id || mk.nama}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl"
                    style={{ background: "#FFFFFF9E" }}>
                    <div
                      className="w-1.5 h-9 rounded-full flex-shrink-0"
                      style={{ background: mk.warna || C.mintDeep }}
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-[13.5px] font-semibold truncate"
                        style={{ color: C.ink }}>
                        {mk.nama}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        {mk.jamMulai && (
                          <span
                            className="text-[11px]"
                            style={{ color: C.inkFaint }}>
                            {mk.jamMulai.slice(0, 5)} ·{" "}
                          </span>
                        )}
                        <span
                          className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            background: mk.sudah ? "#8FD8BE22" : "#F6C4531F",
                            color: mk.sudah ? C.mintDeep : C.amberDeep,
                          }}>
                          {mk.sudah
                            ? "✅ Sudah dipersiapkan"
                            : "Belum dipersiapkan"}
                        </span>
                      </div>
                    </div>
                    {!isParent && !mk.sudah && (
                      <button
                        onClick={() => handleMulaiPersiapan(mk)}
                        className="flex-shrink-0 text-[11.5px] font-bold px-3 py-2 rounded-xl"
                        style={{ background: C.mintDeep, color: "#FFFFFF" }}>
                        ✨ Mulai
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {!isParent && (
                <Link
                  to="/akademik/persiapan"
                  className="inline-block mt-3.5 -mx-1 px-1 py-2 text-[12px] font-semibold"
                  style={{ color: C.mintDeep }}>
                  Lihat semua persiapan →
                </Link>
              )}
            </Card>
          )}
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
