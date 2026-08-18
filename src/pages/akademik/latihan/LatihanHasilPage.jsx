import { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import { C, FONT_IMPORT } from "../../../lib/theme";
import { Card } from "../../../components/ui";
import { pemahamanMeta, sumberMeta, formatDurasi, modeMeta } from "./constants";

// ============================================================
// LatihanHasilPage — nampilin skor & pembahasan dari data yang
// udah ada di route state (gak query apapun). Baru pas user tap
// "Simpan & Selesai" satu baris RINGKASAN di-insert ke DB --
// soal & jawaban detail TIDAK disimpan (lihat catatan di
// migration SQL kenapa).
// ============================================================
export default function LatihanHasilPage({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const payload = location.state;

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const soalList = payload?.soal || [];
  const totalSoal = soalList.length;
  const jumlahBenar = payload?.jumlahBenar ?? 0;
  const skorPersen = totalSoal > 0 ? (jumlahBenar / totalSoal) * 100 : 0;
  const pm = pemahamanMeta(skorPersen);
  const sm = sumberMeta(payload?.sumber);
  const mm = modeMeta(payload?.mode);

  // Topik lemah -- ambil unik dari soal yang salah, maksimal 5 biar
  // gak kepanjangan di UI.
  const topikLemah = useMemo(() => {
    const unik = [...new Set(payload?.salahTopik || [])];
    return unik.slice(0, 5);
  }, [payload]);

  if (!payload || totalSoal === 0) {
    navigate("/akademik/latihan", { replace: true });
    return null;
  }

  async function handleSimpan() {
    setSaving(true);
    setError("");
    const { error: insertError } = await supabase.from("latihan_sesi").insert({
      user_id: user.id,
      mata_kuliah_id: payload.mataKuliahId || null,
      mata_kuliah_nama: payload.mataKuliahNama,
      sumber: payload.sumber,
      mode: payload.mode,
      jumlah_soal: totalSoal,
      jumlah_benar: jumlahBenar,
      skor_persen: Number(skorPersen.toFixed(2)),
      topik_lemah: topikLemah,
      durasi_detik: payload.durasiDetik || null,
    });
    setSaving(false);
    if (insertError) {
      setError("Gagal menyimpan hasil, coba lagi.");
      return;
    }
    setSaved(true);
  }

  return (
    <div
      className="max-w-lg mx-auto px-4 sm:px-6 py-8 sm:py-10 pb-16"
      style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{FONT_IMPORT}</style>

      <div className="text-center mb-6">
        <div
          className="w-20 h-20 mx-auto rounded-full flex items-center justify-center text-[36px] mb-3"
          style={{ background: pm.bg }}>
          {pm.icon}
        </div>
        <p
          style={{ fontFamily: "'Fraunces', serif", color: C.ink }}
          className="text-[34px] font-semibold leading-none">
          {jumlahBenar} / {totalSoal}
        </p>
        <p className="text-[13px] font-bold mt-2" style={{ color: pm.color }}>
          Pemahaman: {pm.label}
        </p>
        <p className="text-[12px] mt-1" style={{ color: C.inkFaint }}>
          {payload.mataKuliahNama} · {mm.label}
          {payload.durasiDetik ? ` · ${formatDurasi(payload.durasiDetik)}` : ""}
        </p>
        <span
          className="inline-flex items-center gap-1 mt-2.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
          style={{ background: sm.bg, color: sm.color }}>
          {sm.icon} {sm.label}
        </span>
      </div>

      {topikLemah.length > 0 && (
        <Card border className="mb-5" accent={C.roseDeep}>
          <p
            className="text-[12.5px] font-bold mb-1.5"
            style={{ color: C.ink }}>
            Perlu dipelajari lagi:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {topikLemah.map((t) => (
              <span
                key={t}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: "#F4A6B71F", color: C.roseDeep }}>
                {t}
              </span>
            ))}
          </div>
        </Card>
      )}

      {error && (
        <div
          className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 mb-3.5 text-[12px] font-medium"
          style={{ background: "#F4A6B71F", color: C.roseDeep }}>
          ⚠️ {error}
        </div>
      )}

      {!saved ? (
        <button
          onClick={handleSimpan}
          disabled={saving}
          className="w-full py-3.5 rounded-2xl font-bold text-[14px] disabled:opacity-50 mb-3"
          style={{
            background: `linear-gradient(135deg, ${C.lavender}, ${C.skyDeep})`,
            color: "#FFFFFF",
            boxShadow: "0 14px 28px -14px rgba(139,114,196,0.5)",
          }}>
          {saving ? "Menyimpan..." : "💾 Simpan & Selesai"}
        </button>
      ) : (
        <div
          className="flex items-center justify-center gap-2 rounded-2xl px-3.5 py-3 mb-3 text-[13px] font-semibold"
          style={{ background: "#8FD8BE22", color: C.mintDeep }}>
          ✓ Hasil tersimpan
        </div>
      )}

      <button
        onClick={() => navigate("/akademik/latihan")}
        className="w-full py-3 rounded-2xl text-[13px] font-semibold mb-8"
        style={{ background: "#463F5C0f", color: C.ink }}>
        {saved ? "Kembali ke Latihan" : "Lewati, jangan simpan"}
      </button>

      <h2
        style={{ fontFamily: "'Fraunces', serif", color: C.ink }}
        className="text-[16px] font-semibold mb-3">
        Pembahasan
      </h2>
      <div className="space-y-3">
        {soalList.map((s, i) => {
          const userAns = payload.jawaban?.[s.id];
          const benar =
            (userAns || "").trim().toLowerCase() ===
            (s.jawaban_benar || "").trim().toLowerCase();
          return (
            <Card key={s.id} className="!p-4" border>
              <div className="flex items-start gap-2.5 mb-2">
                <span
                  className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold text-white"
                  style={{ background: benar ? C.mintDeep : C.roseDeep }}>
                  {benar ? "✓" : "✕"}
                </span>
                <p
                  className="text-[13.5px] font-semibold leading-snug"
                  style={{ color: C.ink }}>
                  {i + 1}. {s.pertanyaan}
                </p>
              </div>
              <p className="text-[12px] ml-8" style={{ color: C.inkFaint }}>
                Jawaban kamu:{" "}
                <span style={{ color: benar ? C.mintDeep : C.roseDeep }}>
                  {userAns || "(kosong)"}
                </span>
              </p>
              {!benar && (
                <p
                  className="text-[12px] ml-8 mt-0.5"
                  style={{ color: C.mintDeep }}>
                  Jawaban benar: {s.jawaban_benar}
                </p>
              )}
              {s.pembahasan && (
                <p
                  className="text-[12px] ml-8 mt-1.5 leading-relaxed"
                  style={{ color: C.inkSoft }}>
                  💡 {s.pembahasan}
                </p>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
