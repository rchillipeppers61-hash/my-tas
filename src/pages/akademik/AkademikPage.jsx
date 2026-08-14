import { Link } from "react-router-dom";
import { C, FONT_IMPORT } from "../../lib/theme";
import { capitalize } from "../../lib/format";

// ============================================================
// AkademikPage — landing card menu buat modul Akademik.
// Sub-modul lain (Jadwal, Tugas, dst) diakses dari sini, bukan
// langsung dari nav utama -- pola sama kayak WalletPage yang jadi
// pintu masuk ke ChildDashboard/ParentDashboard.
// ============================================================

// Tinggal nambah 1 entry di sini kalau ada sub-modul baru
// (Catatan Kuliah, IPK Tracker) yang mau diaktifkan.
const MENU_ITEMS = [
  {
    to: "/akademik/jadwal",
    icon: "🗓️",
    title: "Jadwal Kuliah",
    desc: "Lihat jadwal mingguan & atur ruangan, dosen, jam kelas.",
    accent: C.lavender,
    tint: "#8B72C41A",
    active: true,
  },
  {
    to: "/akademik/tugas",
    icon: "📌",
    title: "Tugas & Deadline",
    desc: "Catat tugas kuliah biar gak ada yang kelewat deadline.",
    accent: C.roseDeep,
    tint: "#F4A6B71F",
    active: true,
  },
  {
    to: "/akademik/catatan",
    icon: "📝",
    title: "Catatan Kuliah",
    desc: "Simpen rangkuman materi per mata kuliah.",
    accent: C.skyDeep,
    tint: "#9FCBF01F",
    active: false,
  },
  {
    to: "/akademik/ipk",
    icon: "📊",
    title: "IPK Tracker",
    desc: "Pantau perkembangan IPK tiap semester.",
    accent: C.amberDeep,
    tint: "#F6C4531F",
    active: false,
  },
];

export default function AkademikPage({ user }) {
  const name = capitalize(user?.username) || "Kamu";

  return (
    <div
      className="max-w-2xl lg:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10"
      style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{FONT_IMPORT}</style>

      <p
        className="text-[11px] tracking-[0.2em] uppercase font-semibold mb-1"
        style={{ color: C.lavender }}>
        Akademik
      </p>
      <h1
        style={{ fontFamily: "'Fraunces', serif", color: C.ink }}
        className="text-[24px] font-semibold mb-2">
        Urusan Kuliah, {name} 🎓
      </h1>
      <p
        className="text-[13.5px] leading-relaxed mb-6 sm:mb-8"
        style={{ color: C.inkFaint }}>
        Semua yang berhubungan sama kuliah kesimpen di sini -- jadwal, tugas,
        sampai catatan.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {MENU_ITEMS.map((item) => (
          <MenuCard key={item.to} {...item} />
        ))}
      </div>
    </div>
  );
}

function MenuCard({ to, icon, title, desc, accent, tint, active }) {
  const content = (
    <div
      className="relative overflow-hidden rounded-3xl p-5 sm:p-6 h-full transition-transform"
      style={{
        background: active ? tint : "#463F5C0a",
        boxShadow: active
          ? "0 1px 0 rgba(70,63,92,0.04), 0 12px 28px -16px rgba(70,63,92,0.22)"
          : "none",
      }}>
      {active && (
        <div
          className="absolute inset-x-0 top-0 h-[3px]"
          style={{ background: accent }}
        />
      )}

      <div className="flex items-start justify-between gap-2 mb-3">
        <div
          className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center text-[20px] sm:text-[22px] flex-shrink-0"
          style={{ background: active ? "#FFFFFF" : "#463F5C10" }}>
          {icon}
        </div>
        {!active && (
          <span
            className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
            style={{ background: "#463F5C14", color: C.inkFaint }}>
            Segera
          </span>
        )}
      </div>

      <h3
        style={{
          fontFamily: "'Fraunces', serif",
          color: active ? C.ink : C.inkFaint,
        }}
        className="text-[16px] sm:text-[17px] font-semibold mb-1">
        {title}
      </h3>
      <p
        className="text-[12.5px] leading-relaxed"
        style={{ color: active ? C.inkSoft : C.inkFaint }}>
        {desc}
      </p>

      {active && (
        <span
          className="inline-flex items-center gap-1 mt-3.5 text-[12px] font-semibold"
          style={{ color: accent }}>
          Buka →
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
