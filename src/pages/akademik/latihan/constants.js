// Konstanta & helper SPESIFIK buat modul Latihan & Kuis AI.
// Sama kayak pages/akademik/constants.js -- pola file terpisah per modul.

import { C } from "../../../lib/theme";

// ------------------------------------------------------------
// Mode Latihan -- 3 tahap intensitas, sesuai dokumentasi fitur.
// ------------------------------------------------------------
export const MODE_LATIHAN = [
  {
    value: "quick",
    label: "Quick Quiz",
    subtitle: "5 soal · ±5 menit",
    desc: "Review cepat, cocok buat ngecek ingatan sebelum lupa.",
    icon: "⚡",
    jumlahSoal: 5,
    adaPembahasan: false,
    adaTimer: false,
    color: C.mintDeep,
    bg: "#8FD8BE22",
  },
  {
    value: "study",
    label: "Study Quiz",
    subtitle: "10–15 soal · ada pembahasan",
    desc: "Fokus pemahaman materi, tiap soal dikasih pembahasan.",
    icon: "📚",
    jumlahSoal: 12,
    adaPembahasan: true,
    adaTimer: false,
    color: C.skyDeep,
    bg: "#9FCBF01F",
  },
  {
    value: "exam",
    label: "Exam Simulation",
    subtitle: "20–30 soal · pakai timer",
    desc: "Simulasi kondisi ujian, buat persiapan UTS/UAS.",
    icon: "🎯",
    jumlahSoal: 25,
    adaPembahasan: true,
    adaTimer: true,
    detikPerSoal: 75, // dipakai buat hitung total durasi timer
    color: C.roseDeep,
    bg: "#F4A6B71F",
  },
];

export const modeMeta = (v) =>
  MODE_LATIHAN.find((m) => m.value === v) || MODE_LATIHAN[0];

// ------------------------------------------------------------
// Penilaian pemahaman -- label kualitatif dari skor persen,
// dipakai di layar hasil.
// ------------------------------------------------------------
export function pemahamanMeta(persen) {
  if (persen >= 80)
    return { label: "Baik", icon: "⭐", color: C.mintDeep, bg: "#8FD8BE22" };
  if (persen >= 60)
    return {
      label: "Cukup",
      icon: "👍",
      color: C.amberDeep,
      bg: "#F6C4531F",
    };
  return {
    label: "Perlu Ditingkatkan",
    icon: "💪",
    color: C.roseDeep,
    bg: "#F4A6B71F",
  };
}

// ------------------------------------------------------------
// Sumber soal -- badge yang dipampang di layar setup & hasil,
// biar user tau soal ini berbasis catatan sendiri atau
// pengetahuan umum AI (transparansi, sesuai prinsip di dokumentasi).
// ------------------------------------------------------------
export function sumberMeta(sumber) {
  if (sumber === "catatan")
    return {
      label: "Berbasis catatan kamu",
      icon: "📝",
      color: C.lavender,
      bg: "#8B72C41A",
    };
  return {
    label: "Pengetahuan umum AI",
    icon: "🌐",
    color: C.skyDeep,
    bg: "#9FCBF01F",
  };
}

// Panjang minimal gabungan teks catatan biar dianggap "cukup" buat
// jadi sumber -- di bawah ini fallback ke mode umum. Angka ini sengaja
// disamakan sama ambang batas yang dipakai edge function
// (lihat supabase/functions/generate-latihan), biar badge yang
// ditampilin SEBELUM generate tetap akurat/gak nge-janjiin salah.
export const MIN_PANJANG_CATATAN = 40;

export function formatDurasi(detik) {
  if (!detik && detik !== 0) return "-";
  const m = Math.floor(detik / 60);
  const s = detik % 60;
  if (m === 0) return `${s} detik`;
  return `${m} menit ${s > 0 ? `${s} detik` : ""}`.trim();
}

export function formatTanggalSesi(iso) {
  const d = new Date(iso);
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
