// Konstanta & helper yang SPESIFIK buat modul Wallet.
// Kalau modul lain (misal Akademik) butuh kategori/limit sendiri,
// bikin file constants terpisah di modul itu -- jangan taro di sini.

export const CATEGORIES = [
  { value: "makan", label: "Makan" },
  { value: "jajan", label: "Jajan" },
  { value: "hiburan", label: "Hiburan" },
  { value: "transport", label: "Transport" },
  { value: "kuliah", label: "Kebutuhan Kuliah" },
  { value: "pribadi", label: "Kebutuhan Pribadi" },
  { value: "lainnya", label: "Lainnya" },
];

export const categoryLabel = (v) =>
  CATEGORIES.find((c) => c.value === v)?.label || "Lainnya";

// Batas saldo minimum. Kalau saldo anak di bawah ini, orang tua
// akan lihat notifikasi peringatan di ParentDashboard. Ubah angka
// ini sesuai kebutuhan keluarga.
export const LOW_BALANCE_LIMIT = 100000;
