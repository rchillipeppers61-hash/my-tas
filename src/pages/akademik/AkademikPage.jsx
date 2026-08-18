import { Link } from "react-router-dom";
import { C, FONT_IMPORT } from "../../lib/theme";

// ============================================================
// AkademikPage — landing card menu buat modul Akademik.
// Gaya "Aksi Cepat": ikon kotak warna solid + judul singkat,
// tanpa deskripsi panjang -- biar cepet discan mata.
// ============================================================

// Tinggal nambah 1 entry di sini kalau ada sub-modul baru
// yang mau diaktifkan.
const MENU_ITEMS = [
  {
    to: "/akademik/jadwal",
    icon: "🗓️",
    title: "Jadwal Kuliah",
    accent: C.lavender,
    tint: "#8B72C41A",
    active: true,
  },
  {
    to: "/akademik/persiapan",
    icon: "✨",
    title: "Persiapan Kuliah",
    accent: C.mintDeep,
    tint: "#8FD8BE22",
    active: true,
  },
  {
    to: "/akademik/tugas",
    icon: "📌",
    title: "Tugas & Deadline",
    accent: C.roseDeep,
    tint: "#F4A6B71F",
    active: true,
  },
  {
    to: "/journal",
    icon: "📝",
    title: "Catatan Kuliah",
    accent: C.skyDeep,
    tint: "#9FCBF01F",
    active: true,
  },
  {
    to: "/akademik/ipk",
    icon: "📊",
    title: "IPK Tracker",
    accent: C.amberDeep,
    tint: "#F6C4531F",
    active: true,
  },
  {
    to: "/akademik/latihan",
    icon: "🎯",
    title: "Latihan & Kuis AI",
    accent: C.roseDeep,
    tint: "#F4A6B71F",
    active: true,
  },
];

export default function AkademikPage() {
  return (
    <div
      className="max-w-2xl lg:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10"
      style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{FONT_IMPORT}</style>

      <h1
        style={{ fontFamily: "'Fraunces', serif", color: C.ink }}
        className="text-[18px] sm:text-[24px] font-semibold mb-6 sm:mb-8 leading-snug">
        Jadwal, Tugas & Catatan Kuliah 🎓
      </h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 lg:gap-4">
        {MENU_ITEMS.map((item) => (
          <MenuCard key={item.to} {...item} />
        ))}
      </div>
    </div>
  );
}

function MenuCard({ to, icon, title, accent, tint, active }) {
  const content = (
    <div
      className="flex flex-col items-center justify-center text-center gap-2.5 sm:gap-3 rounded-2xl sm:rounded-3xl px-3 py-5 sm:py-6 h-full transition-transform border-2"
      style={{
        background: active ? tint : "#463F5C0a",
        borderColor: active ? `${accent}4D` : "#463F5C26",
      }}>
      <div
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-[22px] sm:text-[26px] flex-shrink-0"
        style={{
          background: active ? accent : "#463F5C10",
          boxShadow: active ? `0 8px 16px -8px ${accent}80` : "none",
        }}>
        {icon}
      </div>

      <h3
        style={{ color: active ? C.ink : C.inkFaint }}
        className="text-[12.5px] sm:text-[13.5px] font-semibold leading-snug">
        {title}
      </h3>

      {!active && (
        <span
          className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: "#463F5C14", color: C.inkFaint }}>
          Segera
        </span>
      )}
    </div>
  );

  if (!active) {
    return (
      <div className="cursor-not-allowed" aria-disabled="true">
        {content}
      </div>
    );
  }

  return (
    <Link to={to} className="block active:scale-[0.98] transition-transform">
      {content}
    </Link>
  );
}
