// Helper generik yang dipakai lintas modul (bukan cuma Wallet).
// Kalau ada modul baru butuh format tanggal/angka/string yang sama,
// taro di sini, JANGAN duplikat di modul masing-masing.

export const rupiah = (n) => "Rp" + Math.round(n).toLocaleString("id-ID");

// Dipakai di input nominal uang (jumlah transaksi, target nabung, dll)
// biar user gampang baca angka gede sambil ngetik -- "300000" tampil
// jadi "300.000". State tetep nyimpen ANGKA MENTAH (tanpa titik),
// formatThousands cuma buat display, stripThousands buat balikin ke
// angka mentah pas user ngetik/nge-paste.
export const formatThousands = (value) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("id-ID");
};

export const stripThousands = (value) => String(value ?? "").replace(/\D/g, "");

export const capitalize = (s) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

export const monthLabel = (ym) => {
  const [y, m] = ym.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
};

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const formatDay = (d) =>
  new Date(d).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

export const daysBetween = (a, b) =>
  Math.max(1, Math.round((new Date(b) - new Date(a)) / 86400000) + 1);
