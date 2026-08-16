import { useNavigate } from "react-router-dom";
import { C, FONT_IMPORT } from "../../lib/theme";
import { Card } from "../../components/ui";
import { kedalamanMeta } from "./constants";
import { CONTOH_STUDY_PACKS } from "./persiapanDummy";

// ============================================================
// PersiapanPage — landing "Persiapan Kuliah" (AI Study Preparation).
// FASE 1: belum nyambung Supabase, riwayat masih data contoh dari
// persiapanDummy.js. Fase 2 nanti tabel `study_packs` dibikin & data
// beneran diambil dari situ, struktur halaman ini gak berubah.
// ============================================================
export default function PersiapanPage({ user }) {
  const navigate = useNavigate();
  const isParent = user?.role === "orang_tua";

  // TODO(Fase 2): ganti CONTOH_STUDY_PACKS dengan fetch ke tabel
  // `study_packs` (pakai pola isParent/targetId sama kayak TugasPage).
  const studyPacks = CONTOH_STUDY_PACKS;

  return (
    <div
      className="max-w-2xl lg:max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-7 pb-28 lg:pb-10"
      style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{FONT_IMPORT}</style>

      <div className="flex items-center justify-between mb-2">
        <div>
          <h1
            style={{ fontFamily: "'Fraunces', serif", color: C.ink }}
            className="text-[22px] sm:text-[24px] font-semibold">
            {isParent ? "Persiapan Kuliah Anak" : "Persiapan Kuliah"}
          </h1>
          <p className="text-[12px] sm:text-[13px] mt-1" style={{ color: C.inkFaint }}>
            Study Pack dibuat AI buat bantu belajar sebelum kelas.
          </p>
        </div>
        <button
          onClick={() => navigate("/akademik/persiapan/tambah")}
          className="hidden sm:flex items-center gap-1.5 px-4 py-2.5 rounded-2xl font-semibold text-[13px] flex-shrink-0"
          style={{
            background: `linear-gradient(135deg, ${C.mintDeep}, ${C.mint})`,
            color: "#FFFFFF",
          }}>
          ✨ Buat Baru
        </button>
      </div>

      <div
        className="flex items-center gap-2.5 rounded-2xl px-4 py-3 mt-5 mb-5"
        style={{ background: "#8FD8BE1F", border: "1.5px solid #8FD8BE55" }}>
        <span className="text-[16px] flex-shrink-0">🧪</span>
        <p className="text-[12px] font-medium" style={{ color: C.mintDeep }}>
          Preview Fase 1 — hasil Study Pack di bawah masih contoh, belum
          dari AI beneran.
        </p>
      </div>

      {studyPacks.length === 0 ? (
        <Card border className="text-center py-10">
          <div
            className="w-14 h-14 mx-auto rounded-full flex items-center justify-center text-[26px] mb-3"
            style={{ background: "#8FD8BE22" }}>
            ✨
          </div>
          <p className="text-[13.5px] font-medium mb-1" style={{ color: C.ink }}>
            Belum ada persiapan
          </p>
          <p className="text-[12px]" style={{ color: C.inkFaint }}>
            Buat Study Pack pertama biar makin siap masuk kelas.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {studyPacks.map((sp) => (
            <StudyPackCard
              key={sp.id}
              studyPack={sp}
              onClick={() =>
                navigate("/akademik/persiapan/detail", { state: { studyPack: sp } })
              }
            />
          ))}
        </div>
      )}

      <button
        onClick={() => navigate("/akademik/persiapan/tambah")}
        className="fixed right-5 sm:right-8 sm:hidden w-14 h-14 rounded-full flex items-center justify-center text-[24px]"
        style={{
          bottom: "calc(4.5rem + env(safe-area-inset-bottom, 0px) + 0.75rem)",
          background: `linear-gradient(135deg, ${C.mintDeep}, ${C.mint})`,
          color: "#FFFFFF",
          boxShadow: "0 14px 30px -10px rgba(63,158,124,0.6)",
        }}>
        ✨
      </button>
    </div>
  );
}

function StudyPackCard({ studyPack, onClick }) {
  const k = kedalamanMeta(studyPack.kedalaman);
  return (
    <button onClick={onClick} className="w-full text-left active:scale-[0.99] transition-transform">
      <Card className="!p-4" border accent={C.mintDeep}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold mb-0.5" style={{ color: C.mintDeep }}>
              {studyPack.mataKuliah}
            </p>
            <p className="text-[14.5px] font-semibold truncate" style={{ color: C.ink }}>
              {studyPack.topik}
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              <span
                className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: "#8FD8BE22", color: C.mintDeep }}>
                {k.icon} {k.label}
              </span>
              <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#463F5C0f", color: C.inkFaint }}>
                ✅ Selesai
              </span>
            </div>
          </div>
          <span className="text-[18px] flex-shrink-0" style={{ color: C.mintDeep }}>
            →
          </span>
        </div>
      </Card>
    </button>
  );
}
