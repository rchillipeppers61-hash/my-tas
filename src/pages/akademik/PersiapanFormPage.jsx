import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import { C, FONT_IMPORT } from "../../lib/theme";
import { Card } from "../../components/ui";
import { KEDALAMAN } from "./constants";

const inputClass =
  "w-full mt-1.5 mb-3.5 px-3.5 py-3.5 sm:py-3 rounded-2xl text-[15px] sm:text-[14.5px] outline-none border-[1.5px] transition-shadow focus:ring-4 focus:ring-[#8FD8BE2A]";
const inputStyle = {
  background: "#463F5C08",
  color: C.ink,
  borderColor: "#463F5C1F",
};

const MANUAL_VALUE = "__manual__";

// ============================================================
// PersiapanFormPage — form manual Study Pack. Bisa diakses:
// 1. Dari kartu Jadwal ("✨ Persiapkan Kuliah") -> mata kuliah
//    ke-prefill lewat navigate state { mataKuliah }.
// 2. Langsung dari PersiapanPage -> semua field kosong, user pilih
//    mata kuliah dari dropdown (atau isi manual kalau belum ada di
//    Jadwal sama sekali).
//
// FASE 4: konten Study Pack SEKARANG beneran digenerate AI lewat
// Supabase Edge Function `generate-study-pack` (panggil Groq
// server-side, key aman di secrets -- lihat supabase/functions/
// generate-study-pack/index.ts). Function itu juga yang ngerjain
// insert ke tabel `study_packs` & convert snake_case -> camelCase,
// jadi di sini kita TINGGAL PANGGIL & PAKAI hasilnya langsung --
// gak ada lagi generateDummyStudyPack() atau insert manual ke
// Supabase kayak sebelumnya.
// ============================================================
export default function PersiapanFormPage({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isParent = user.role === "orang_tua";
  const targetId = isParent ? user.linked_child_id : user.id;
  const targetLinked = isParent ? Boolean(user.linked_child_id) : true;

  const prefillMk = location.state?.mataKuliah || null;

  const [mataKuliahList, setMataKuliahList] = useState([]);
  const [loadingMk, setLoadingMk] = useState(true);

  const [form, setForm] = useState({
    mataKuliahId: prefillMk?.id || "",
    mataKuliahManual: "",
    topik: "",
    cakupan: "",
    kedalaman: "standar",
  });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!targetLinked) {
      setLoadingMk(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("mata_kuliah")
        .select("id, nama, warna")
        .eq("user_id", targetId)
        .order("nama", { ascending: true });
      setMataKuliahList(data || []);
      // Kalau prefill dari Jadwal gak ketemu di list (mis. data beda user),
      // fallback ke manual biar nama-nya tetep kepake.
      if (prefillMk && !(data || []).some((mk) => mk.id === prefillMk.id)) {
        setForm((f) => ({
          ...f,
          mataKuliahId: MANUAL_VALUE,
          mataKuliahManual: prefillMk.nama || "",
        }));
      }
      setLoadingMk(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isManual = form.mataKuliahId === MANUAL_VALUE;

  function resolvedMataKuliahName() {
    if (isManual) return form.mataKuliahManual.trim();
    const found = mataKuliahList.find((mk) => mk.id === form.mataKuliahId);
    return found?.nama || "";
  }

  async function handleGenerate() {
    const mataKuliah = resolvedMataKuliahName();
    if (!mataKuliah || !form.topik.trim()) {
      setError("Isi mata kuliah dan topik/materi dulu ya.");
      return;
    }
    setError("");
    setGenerating(true);

    // Panggil Edge Function -- ini yang manggil Groq di server-side
    // (key aman, gak kebawa ke frontend) DAN sekaligus insert hasilnya
    // ke tabel `study_packs`. Respons udah dalam bentuk camelCase yang
    // sama persis kayak yang dipake StudyPackDetailPage.jsx.
    const { data, error: invokeError } = await supabase.functions.invoke(
      "generate-study-pack",
      {
        body: {
          mataKuliah,
          topik: form.topik.trim(),
          cakupan: form.cakupan.trim(),
          kedalaman: form.kedalaman,
          userId: targetId,
        },
      },
    );

    setGenerating(false);

    // invokeError -- gagal manggil function-nya sendiri (network,
    // timeout, dll). data?.error -- function-nya kepanggil tapi
    // ngebalikin error terkontrol (mis. status 400/404/500 dari
    // dalam index.ts, kayak "User tidak ditemukan" atau field AI
    // yang kosong/gagal divalidasi).
    if (invokeError || data?.error) {
      setError(
        data?.error ||
          "Gagal generate Study Pack. AI mungkin lagi sibuk, coba lagi sebentar lagi.",
      );
      return;
    }

    if (!data?.studyPack) {
      setError("Study Pack gak ketemu di hasil AI, coba generate ulang.");
      return;
    }

    navigate("/akademik/persiapan/detail", {
      state: { studyPack: data.studyPack },
      replace: true,
    });
  }

  if (!targetLinked) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <style>{FONT_IMPORT}</style>
        <h1
          style={{ fontFamily: "'Fraunces', serif", color: C.ink }}
          className="text-[22px] sm:text-[24px] font-semibold mb-4">
          Persiapan Kuliah
        </h1>
        <Card border>
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
      className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10 pb-28"
      style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{FONT_IMPORT}</style>

      <button
        onClick={() => navigate(-1)}
        disabled={generating}
        className="text-[12.5px] font-semibold mb-4 disabled:opacity-50"
        style={{ color: C.inkFaint }}>
        ← Kembali
      </button>

      <h1
        style={{ fontFamily: "'Fraunces', serif", color: C.ink }}
        className="text-[20px] sm:text-[24px] font-semibold mb-1">
        Persiapkan Kuliah
      </h1>
      <p
        className="text-[12.5px] sm:text-[13px] mb-6"
        style={{ color: C.inkFaint }}>
        Isi topik yang mau dipelajari, AI bakal susun Study Pack-nya.
      </p>

      <Card>
        <label
          className="text-[11px] uppercase tracking-wide font-bold"
          style={{ color: C.inkFaint }}>
          Mata Kuliah
        </label>
        {loadingMk ? (
          <div className={inputClass} style={inputStyle}>
            Memuat...
          </div>
        ) : (
          <div className="relative">
            <select
              value={form.mataKuliahId}
              onChange={(e) =>
                setForm((f) => ({ ...f, mataKuliahId: e.target.value }))
              }
              disabled={generating}
              className={`${inputClass} appearance-none pr-9 disabled:opacity-60`}
              style={inputStyle}>
              <option value="" disabled>
                Pilih mata kuliah
              </option>
              {mataKuliahList.map((mk) => (
                <option key={mk.id} value={mk.id}>
                  {mk.nama}
                </option>
              ))}
              <option value={MANUAL_VALUE}>✏️ Tulis manual...</option>
            </select>
            <span
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 -mt-1.5 text-[12px]"
              style={{ color: C.inkFaint }}>
              ▾
            </span>
          </div>
        )}

        {isManual && (
          <input
            type="text"
            value={form.mataKuliahManual}
            onChange={(e) =>
              setForm((f) => ({ ...f, mataKuliahManual: e.target.value }))
            }
            placeholder="Nama mata kuliah"
            disabled={generating}
            className={`${inputClass} disabled:opacity-60`}
            style={inputStyle}
          />
        )}

        <label
          className="text-[11px] uppercase tracking-wide font-bold"
          style={{ color: C.inkFaint }}>
          Topik / Materi
        </label>
        <input
          type="text"
          value={form.topik}
          onChange={(e) => setForm((f) => ({ ...f, topik: e.target.value }))}
          placeholder="Cth: Ekowisata Bahari"
          disabled={generating}
          className={`${inputClass} disabled:opacity-60`}
          style={inputStyle}
        />

        <label
          className="text-[11px] uppercase tracking-wide font-bold"
          style={{ color: C.inkFaint }}>
          Cakupan Materi{" "}
          <span className="normal-case font-medium">(opsional)</span>
        </label>
        <textarea
          value={form.cakupan}
          onChange={(e) => setForm((f) => ({ ...f, cakupan: e.target.value }))}
          placeholder="Poin-poin yang mau dicover, atau tempel dari silabus"
          rows={3}
          disabled={generating}
          className={`${inputClass} resize-none disabled:opacity-60`}
          style={inputStyle}
        />

        <label
          className="text-[11px] uppercase tracking-wide font-bold mb-1.5 block"
          style={{ color: C.inkFaint }}>
          Kedalaman
        </label>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {KEDALAMAN.map((k) => {
            const active = form.kedalaman === k.value;
            return (
              <button
                key={k.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, kedalaman: k.value }))}
                disabled={generating}
                className="rounded-2xl px-2 py-3 text-center transition-all disabled:opacity-60"
                style={{
                  background: active
                    ? `linear-gradient(135deg, ${C.mintDeep}, ${C.mint})`
                    : "#463F5C08",
                  border: `1.5px solid ${active ? "transparent" : "#463F5C1F"}`,
                }}>
                <div className="text-[16px] mb-1">{k.icon}</div>
                <div
                  className="text-[11.5px] font-bold"
                  style={{ color: active ? "#FFFFFF" : C.ink }}>
                  {k.label}
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-[11.5px] -mt-2 mb-4" style={{ color: C.inkFaint }}>
          {KEDALAMAN.find((k) => k.value === form.kedalaman)?.desc}
        </p>

        {error && (
          <div
            className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 mb-3.5 text-[12px] font-medium"
            style={{ background: "#F4A6B71F", color: C.roseDeep }}>
            ⚠️ {error}
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full py-3.5 sm:py-4 rounded-2xl font-bold text-[14px] sm:text-[15px] disabled:opacity-60 transition-shadow flex items-center justify-center gap-2"
          style={{
            background: `linear-gradient(135deg, ${C.mintDeep}, ${C.mint})`,
            color: "#FFFFFF",
            boxShadow: "0 14px 28px -14px rgba(63,158,124,0.6)",
          }}>
          {generating ? (
            <>
              <Spinner />
              AI sedang menyusun Study Pack...
            </>
          ) : (
            "✨ Generate Study Pack"
          )}
        </button>
        {generating && (
          <p
            className="text-[11px] text-center mt-2.5"
            style={{ color: C.inkFaint }}>
            Biasanya 10–30 detik, jangan tutup halaman ini dulu ya.
          </p>
        )}
      </Card>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none">
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
