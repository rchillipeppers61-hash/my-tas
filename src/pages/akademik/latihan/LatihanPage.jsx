import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import { C, FONT_IMPORT } from "../../../lib/theme";
import { Card } from "../../../components/ui";
import { generateLatihan, LatihanError } from "./latihanClient";
import {
  MODE_LATIHAN,
  modeMeta,
  pemahamanMeta,
  sumberMeta,
  MIN_PANJANG_CATATAN,
  formatTanggalSesi,
} from "./constants";

// ============================================================
// LatihanPage — dua tampilan beda tergantung role:
// - Anak: pilih mata kuliah + mode, sistem auto-deteksi sumber
//   (catatan vs pengetahuan umum), lalu generate & mulai sesi.
// - Orang tua: read-only, lihat riwayat & performa latihan anak
//   (gak ada tombol mulai latihan sama sekali).
// ============================================================
export default function LatihanPage({ user }) {
  const navigate = useNavigate();
  const isParent = user.role === "orang_tua";
  const targetId = isParent ? user.linked_child_id : user.id;
  const targetLinked = isParent ? Boolean(user.linked_child_id) : true;

  const [mataKuliahList, setMataKuliahList] = useState([]);
  const [loadingMk, setLoadingMk] = useState(true);
  const [selectedMkId, setSelectedMkId] = useState("");
  const [mode, setMode] = useState("quick");

  const [catatanPreview, setCatatanPreview] = useState({
    loading: false,
    tersedia: false,
    text: "",
  });

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const [riwayat, setRiwayat] = useState([]);
  const [loadingRiwayat, setLoadingRiwayat] = useState(true);

  useEffect(() => {
    if (!targetLinked) {
      setLoadingMk(false);
      setLoadingRiwayat(false);
      return;
    }
    if (!isParent) fetchMataKuliah();
    fetchRiwayat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchMataKuliah() {
    setLoadingMk(true);
    const { data, error: fetchError } = await supabase
      .from("mata_kuliah")
      .select("id, nama")
      .eq("user_id", targetId)
      .order("nama", { ascending: true });
    if (!fetchError) setMataKuliahList(data || []);
    setLoadingMk(false);
  }

  async function fetchRiwayat() {
    setLoadingRiwayat(true);
    const { data, error: fetchError } = await supabase
      .from("latihan_sesi")
      .select("*")
      .eq("user_id", targetId)
      .order("created_at", { ascending: false })
      .limit(10);
    if (!fetchError) setRiwayat(data || []);
    setLoadingRiwayat(false);
  }

  // Begitu MK dipilih, cek dulu ada gak catatan buat MK itu -- biar
  // badge sumber ("berbasis catatan kamu" / "pengetahuan umum") udah
  // akurat SEBELUM user tap mulai, bukan kejutan pas soal muncul.
  useEffect(() => {
    if (!selectedMkId) {
      setCatatanPreview({ loading: false, tersedia: false, text: "" });
      return;
    }
    checkCatatan(selectedMkId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMkId]);

  async function checkCatatan(mkId) {
    setCatatanPreview((prev) => ({ ...prev, loading: true }));
    const { data, error: fetchError } = await supabase
      .from("catatan")
      .select("isi")
      .eq("user_id", targetId)
      .eq("mata_kuliah_id", mkId);

    if (fetchError || !data) {
      setCatatanPreview({ loading: false, tersedia: false, text: "" });
      return;
    }

    const gabungan = data.map((c) => c.isi).join("\n\n");
    setCatatanPreview({
      loading: false,
      tersedia: gabungan.trim().length >= MIN_PANJANG_CATATAN,
      text: gabungan,
    });
  }

  const selectedMk = mataKuliahList.find((mk) => mk.id === selectedMkId);

  async function handleMulai() {
    if (!selectedMkId) {
      setError("Pilih mata kuliahnya dulu ya.");
      return;
    }
    setError("");
    setGenerating(true);
    try {
      const result = await generateLatihan({
        mataKuliahNama: selectedMk.nama,
        catatanText: catatanPreview.tersedia ? catatanPreview.text : "",
        mode,
      });
      navigate("/akademik/latihan/sesi", {
        state: {
          soal: result.soal,
          sumber: result.sumber,
          mode,
          mataKuliahId: selectedMkId,
          mataKuliahNama: selectedMk.nama,
        },
      });
    } catch (err) {
      setError(
        err instanceof LatihanError
          ? err.message
          : "Gagal membuat latihan, coba lagi.",
      );
    } finally {
      setGenerating(false);
    }
  }

  if (!targetLinked) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <style>{FONT_IMPORT}</style>
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
      className="max-w-2xl lg:max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-7 pb-16"
      style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{FONT_IMPORT}</style>

      <h1
        style={{ fontFamily: "'Fraunces', serif", color: C.ink }}
        className="text-[22px] sm:text-[24px] font-semibold mb-1">
        {isParent ? "Latihan & Kuis Anak 🎯" : "Latihan & Kuis AI 🎯"}
      </h1>
      <p
        className="text-[12.5px] sm:text-[13px] mb-6"
        style={{ color: C.inkFaint }}>
        {isParent
          ? "Pantau aktivitas & performa latihan anak kamu di sini."
          : "Ulang materi kuliah dengan soal yang dibikin AI, kapan aja."}
      </p>

      {/* ============ TAMPILAN ANAK: setup latihan ============ */}
      {!isParent && (
        <Card border className="mb-6">
          <label
            className="text-[11px] uppercase tracking-wide font-bold"
            style={{ color: C.inkFaint }}>
            Mata Kuliah
          </label>
          <div className="relative mt-1.5 mb-3.5">
            <select
              value={selectedMkId}
              onChange={(e) => setSelectedMkId(e.target.value)}
              disabled={loadingMk}
              className="w-full px-3.5 py-3 rounded-2xl text-[15px] outline-none border-[1.5px] appearance-none pr-9 focus:ring-4 focus:ring-[#8B72C42A]"
              style={{
                background: "#463F5C08",
                color: C.ink,
                borderColor: "#463F5C1F",
              }}>
              <option value="">
                {loadingMk ? "Memuat..." : "Pilih mata kuliah"}
              </option>
              {mataKuliahList.map((mk) => (
                <option key={mk.id} value={mk.id}>
                  {mk.nama}
                </option>
              ))}
            </select>
            <span
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 -mt-1.5 text-[12px]"
              style={{ color: C.inkFaint }}>
              ▾
            </span>
          </div>

          {!loadingMk && mataKuliahList.length === 0 && (
            <p
              className="text-[11.5px] -mt-2 mb-3.5"
              style={{ color: C.inkFaint }}>
              Belum ada mata kuliah tersimpan. Tambah dulu di halaman Jadwal
              Kuliah.
            </p>
          )}

          {selectedMkId && !catatanPreview.loading && (
            <div
              className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 mb-3.5 text-[12px] font-semibold"
              style={{
                background: sumberMeta(
                  catatanPreview.tersedia ? "catatan" : "umum",
                ).bg,
                color: sumberMeta(catatanPreview.tersedia ? "catatan" : "umum")
                  .color,
              }}>
              <span>
                {sumberMeta(catatanPreview.tersedia ? "catatan" : "umum").icon}
              </span>
              <span>
                {sumberMeta(catatanPreview.tersedia ? "catatan" : "umum").label}
                {!catatanPreview.tersedia &&
                  " — belum ada catatan cukup buat MK ini"}
              </span>
            </div>
          )}

          <label
            className="text-[11px] uppercase tracking-wide font-bold"
            style={{ color: C.inkFaint }}>
            Mode Latihan
          </label>
          <div className="space-y-2 mt-1.5 mb-4">
            {MODE_LATIHAN.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMode(m.value)}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left border-[1.5px] transition-colors"
                style={{
                  background: mode === m.value ? m.bg : "#463F5C08",
                  borderColor: mode === m.value ? m.color : "#463F5C1F",
                }}>
                <span className="text-[20px]">{m.icon}</span>
                <div className="min-w-0 flex-1">
                  <p
                    className="text-[13.5px] font-semibold"
                    style={{ color: C.ink }}>
                    {m.label}
                  </p>
                  <p className="text-[11.5px]" style={{ color: C.inkFaint }}>
                    {m.subtitle}
                  </p>
                </div>
                {mode === m.value && (
                  <span
                    className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] text-white font-bold"
                    style={{ background: m.color }}>
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>

          {error && (
            <div
              className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 mb-3.5 text-[12px] font-medium"
              style={{ background: "#F4A6B71F", color: C.roseDeep }}>
              ⚠️ {error}
            </div>
          )}

          <button
            onClick={handleMulai}
            disabled={generating || !selectedMkId}
            className="w-full py-3.5 rounded-2xl font-bold text-[14px] disabled:opacity-50"
            style={{
              background: `linear-gradient(135deg, ${modeMeta(mode).color}, ${C.lavender})`,
              color: "#FFFFFF",
              boxShadow: "0 14px 28px -14px rgba(139,114,196,0.5)",
            }}>
            {generating ? "Menyiapkan soal..." : "🚀 Mulai Latihan"}
          </button>
        </Card>
      )}

      {/* ============ RIWAYAT / MONITORING (dua-duanya liat) ============ */}
      <h2
        style={{ fontFamily: "'Fraunces', serif", color: C.ink }}
        className="text-[16px] font-semibold mb-3">
        {isParent ? "Riwayat Latihan Anak" : "Riwayat Latihan Kamu"}
      </h2>

      {loadingRiwayat ? (
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[64px] rounded-3xl animate-pulse"
              style={{ background: "#463F5C0F" }}
            />
          ))}
        </div>
      ) : riwayat.length === 0 ? (
        <Card border className="text-center py-8">
          <div
            className="w-12 h-12 mx-auto rounded-full flex items-center justify-center text-[22px] mb-2.5"
            style={{ background: "#8B72C41A" }}>
            🎯
          </div>
          <p className="text-[13px] font-medium" style={{ color: C.ink }}>
            {isParent
              ? "Anak belum pernah latihan"
              : "Belum ada riwayat latihan"}
          </p>
          <p className="text-[11.5px] mt-1" style={{ color: C.inkFaint }}>
            {isParent
              ? "Ingetin anak kamu buat coba latihan soal, yuk."
              : "Yuk coba latihan pertama kamu di atas."}
          </p>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {riwayat.map((sesi) => {
            const pm = pemahamanMeta(sesi.skor_persen);
            const sm = sumberMeta(sesi.sumber);
            const mm = modeMeta(sesi.mode);
            return (
              <Card key={sesi.id} className="!p-4" border>
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center text-[16px]"
                    style={{ background: pm.bg }}>
                    {pm.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-[13.5px] font-semibold truncate"
                      style={{ color: C.ink }}>
                      {sesi.mata_kuliah_nama}
                    </p>
                    <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                      <span
                        className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: mm.bg, color: mm.color }}>
                        {mm.icon} {mm.label}
                      </span>
                      <span
                        className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: sm.bg, color: sm.color }}>
                        {sm.icon} {sm.label}
                      </span>
                      <span
                        className="text-[10.5px] font-medium"
                        style={{ color: C.inkFaint }}>
                        {formatTanggalSesi(sesi.created_at)}
                      </span>
                    </div>
                    {sesi.topik_lemah?.length > 0 && (
                      <p
                        className="text-[11px] mt-1.5"
                        style={{ color: C.roseDeep }}>
                        Perlu dipelajari lagi: {sesi.topik_lemah.join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p
                      style={{
                        fontFamily: "'Fraunces', serif",
                        color: pm.color,
                      }}
                      className="text-[18px] font-semibold leading-none">
                      {sesi.jumlah_benar}/{sesi.jumlah_soal}
                    </p>
                    <p
                      className="text-[10.5px] mt-0.5"
                      style={{ color: C.inkFaint }}>
                      {pm.label}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
