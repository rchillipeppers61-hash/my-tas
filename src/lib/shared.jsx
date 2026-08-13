export const CATEGORIES = [
  { value: "makan", label: "Makan" },
  { value: "pribadi", label: "Kebutuhan Pribadi" }, // ganti dari "kos"
  { value: "transport", label: "Transport" },
  { value: "kuliah", label: "Kebutuhan Kuliah" },
  { value: "jajan", label: "Jajan / Hiburan" },
  { value: "lainnya", label: "Lainnya" },
];

export const categoryLabel = (v) =>
  CATEGORIES.find((c) => c.value === v)?.label || "Lainnya";

export const rupiah = (n) => "Rp" + Math.round(n).toLocaleString("id-ID");

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const formatDay = (d) =>
  new Date(d).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

export const daysBetween = (a, b) =>
  Math.max(1, Math.round((new Date(b) - new Date(a)) / 86400000) + 1);
