import { C } from "../lib/theme";
import { capitalize } from "../lib/format";

// Placeholder Home. Nanti ini jadi ringkasan semua modul
// (preview saldo Wallet, jumlah tugas Akademik, dst).
export default function HomePage({ user }) {
  const name = capitalize(user?.username) || "Kamu";

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <p
        className="text-[11px] tracking-[0.2em] uppercase font-semibold mb-1"
        style={{ color: C.lavender }}>
        Beranda
      </p>
      <h1
        style={{ fontFamily: "'Fraunces', serif", color: C.ink }}
        className="text-[24px] font-semibold mb-2">
        Halo, {name} 👋
      </h1>
      <p className="text-[13.5px] leading-relaxed" style={{ color: C.inkFaint }}>
        Ini halaman Beranda. Ke depannya di sini bakal muncul ringkasan tiap
        modul (misal saldo Wallet, jumlah tugas Akademik yang deadline). Untuk
        sekarang, buka modul lewat menu di samping / bawah ya.
      </p>
    </div>
  );
}
