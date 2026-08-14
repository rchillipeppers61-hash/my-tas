// Konstanta & helper yang SPESIFIK buat modul Akademik.
// Sama kayak pages/wallet/constants.js -- kalau modul lain butuh
// konstanta sendiri, bikin file terpisah, jangan taro di sini.

import { C } from "../../lib/theme";

// ------------------------------------------------------------
// Hari & Jadwal
// ------------------------------------------------------------
export const HARI_LIST = [
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
  "Minggu",
];

// Urutan index dipakai buat sorting jadwal per hari (Senin dulu, dst).
export const hariIndex = (hari) => {
  const i = HARI_LIST.indexOf(hari);
  return i === -1 ? HARI_LIST.length : i;
};

// ------------------------------------------------------------
// Warna Mata Kuliah -- dipilih pas nambah mata kuliah baru di
// JadwalFormPage, dipakai buat badge di JadwalPage & TugasPage.
// ------------------------------------------------------------
export const WARNA_MK = [
  { value: C.lavender, label: "Ungu" },
  { value: C.skyDeep, label: "Biru" },
  { value: C.mintDeep, label: "Hijau" },
  { value: C.roseDeep, label: "Pink" },
  { value: C.amberDeep, label: "Kuning" },
  { value: "#463F5C", label: "Gelap" },
];

// ------------------------------------------------------------
// Status Tugas -- 3 tahap: belum dikerjakan -> lagi dikerjakan -> selesai.
// ------------------------------------------------------------
export const STATUS_TUGAS = [
  {
    value: "belum",
    label: "Belum Dikerjakan",
    icon: "⭕",
    color: C.roseDeep,
    bg: "#F4A6B71F",
  },
  {
    value: "proses",
    label: "Sedang Dikerjakan",
    icon: "🔨",
    color: C.amberDeep,
    bg: "#F6C4531F",
  },
  {
    value: "selesai",
    label: "Selesai",
    icon: "✅",
    color: C.mintDeep,
    bg: "#8FD8BE22",
  },
];

export const statusMeta = (v) =>
  STATUS_TUGAS.find((s) => s.value === v) || STATUS_TUGAS[0];

// Tap status buat siklus belum -> proses -> selesai -> belum lagi.
// Dipakai di TugasPage buat quick-toggle tanpa buka form.
export function nextStatus(current) {
  const idx = STATUS_TUGAS.findIndex((s) => s.value === current);
  const next = STATUS_TUGAS[(idx + 1) % STATUS_TUGAS.length];
  return next.value;
}

// ------------------------------------------------------------
// Prioritas Tugas
// ------------------------------------------------------------
export const PRIORITAS = [
  { value: "rendah", label: "Rendah", color: C.mintDeep, bg: "#8FD8BE22" },
  { value: "sedang", label: "Sedang", color: C.amberDeep, bg: "#F6C4531F" },
  { value: "tinggi", label: "Tinggi", color: C.roseDeep, bg: "#F4A6B71F" },
];

export const prioritasMeta = (v) =>
  PRIORITAS.find((p) => p.value === v) || PRIORITAS[1];

// ------------------------------------------------------------
// Deadline helpers
// ------------------------------------------------------------

// Berapa hari lagi (bisa negatif kalau udah lewat). Dibulatkan ke
// hari kalender, bukan 24 jam presisi -- biar "besok" tetep kebaca
// "besok" walau baru selisih 20 jam dari sekarang.
export function daysUntil(deadlineISO) {
  const now = new Date();
  const target = new Date(deadlineISO);
  const startOfNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
  );
  return Math.round((startOfTarget - startOfNow) / 86400000);
}

// Batas "mendekati deadline" -- dipakai di TugasPage (highlight) &
// nanti di HomePage buat card "Tugas Mendekati Deadline".
export const URGENT_DAYS_LIMIT = 3;

export function formatDeadline(deadlineISO) {
  const d = new Date(deadlineISO);
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function deadlineLabel(deadlineISO) {
  const diff = daysUntil(deadlineISO);
  if (diff < 0) return `Lewat ${Math.abs(diff)} hari`;
  if (diff === 0) return "Hari ini";
  if (diff === 1) return "Besok";
  return `${diff} hari lagi`;
}
