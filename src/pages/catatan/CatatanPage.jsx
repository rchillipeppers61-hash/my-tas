// src/pages/catatan/CatatanPage.jsx
//
// Landing page module Catatan Kuliah.
// Nampilin daftar mata kuliah (dari tabel `mata_kuliah`) beserta jumlah
// catatan yang udah ditulis di tiap mata kuliah. Klik card -> masuk ke
// daftar catatan mata kuliah itu (CatatanDetailPage).
//
// Sama seperti WalletPage / AkademikPage, `user` diterima sebagai prop
// dari App.jsx (bukan dari hook auth), karena project ini pakai session
// custom lewat localStorage, bukan Supabase Auth.
//
// ASUMSI: supabaseClient.js punya `export default supabase`

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";

export default function CatatanPage({ user }) {
  const navigate = useNavigate();

  const [mataKuliahList, setMataKuliahList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    loadData();
  }, [user?.id]);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      // 1. Ambil semua mata kuliah milik user
      const { data: mataKuliah, error: mkError } = await supabase
        .from("mata_kuliah")
        .select("id, nama, dosen, sks, warna")
        .eq("user_id", user.id)
        .order("nama", { ascending: true });

      if (mkError) throw mkError;

      // 2. Ambil semua catatan milik user, buat dihitung per mata kuliah
      const { data: catatan, error: catatanError } = await supabase
        .from("catatan")
        .select("id, mata_kuliah_id, updated_at")
        .eq("user_id", user.id);

      if (catatanError) throw catatanError;

      // 3. Gabungin: hitung jumlah catatan + catatan terakhir per mata kuliah
      const merged = (mataKuliah ?? []).map((mk) => {
        const catatanMk = (catatan ?? []).filter(
          (c) => c.mata_kuliah_id === mk.id,
        );
        const lastUpdated = catatanMk.reduce((latest, c) => {
          const t = new Date(c.updated_at).getTime();
          return t > latest ? t : latest;
        }, 0);

        return {
          ...mk,
          jumlahCatatan: catatanMk.length,
          lastUpdated: lastUpdated ? new Date(lastUpdated) : null,
        };
      });

      setMataKuliahList(merged);
    } catch (err) {
      console.error(err);
      setError("Gagal memuat data catatan. Coba refresh halaman.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-violet-50 px-5 py-8 md:px-10 md:py-12">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <p className="text-xs font-semibold tracking-widest text-violet-600">
          CATATAN
        </p>
        <h1 className="mt-1 font-serif text-3xl font-bold text-slate-900 md:text-4xl">
          Catatan Kuliah{user?.username ? `, ${user.username}` : ""} 📝
        </h1>
        <p className="mt-3 max-w-xl text-slate-600">
          Rangkuman materi tiap mata kuliah, dari yang ditulis manual sampai
          hasil rekaman kelas.
        </p>

        {/* Content */}
        <div className="mt-8">
          {loading && <LoadingGrid />}

          {!loading && error && (
            <ErrorState message={error} onRetry={loadData} />
          )}

          {!loading && !error && mataKuliahList.length === 0 && <EmptyState />}

          {!loading && !error && mataKuliahList.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {mataKuliahList.map((mk) => (
                <MataKuliahCard
                  key={mk.id}
                  mataKuliah={mk}
                  onClick={() => navigate(`/journal/${mk.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MataKuliahCard({ mataKuliah, onClick }) {
  const { nama, dosen, warna, jumlahCatatan, lastUpdated } = mataKuliah;
  const accent = warna || "#7c3aed"; // fallback violet-600

  return (
    <button
      onClick={onClick}
      className="group flex w-full flex-col rounded-2xl border-t-4 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
      style={{ borderTopColor: accent }}>
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-serif text-lg font-bold text-slate-900">{nama}</h2>
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{ backgroundColor: `${accent}1a`, color: accent }}>
          {jumlahCatatan} catatan
        </span>
      </div>

      {dosen && <p className="mt-1 text-sm text-slate-500">{dosen}</p>}

      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-slate-400">
          {lastUpdated
            ? `Terakhir diedit ${formatRelativeDate(lastUpdated)}`
            : "Belum ada catatan"}
        </span>
        <span
          className="font-semibold opacity-0 transition group-hover:opacity-100"
          style={{ color: accent }}>
          Buka →
        </span>
      </div>
    </button>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-36 animate-pulse rounded-2xl bg-white/70 shadow-sm"
        />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border-2 border-dashed border-violet-200 bg-white/50 px-6 py-14 text-center">
      <p className="text-4xl">📚</p>
      <h3 className="mt-3 font-serif text-lg font-bold text-slate-900">
        Belum ada mata kuliah
      </h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
        Tambahkan mata kuliah dulu di halaman Jadwal, nanti otomatis muncul di
        sini buat mulai nyatet.
      </p>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center">
      <p className="font-semibold text-red-700">{message}</p>
      <button
        onClick={onRetry}
        className="mt-3 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700">
        Coba lagi
      </button>
    </div>
  );
}

function formatRelativeDate(date) {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return "barusan";
  if (diffMin < 60) return `${diffMin} menit lalu`;
  if (diffHour < 24) return `${diffHour} jam lalu`;
  if (diffDay < 7) return `${diffDay} hari lalu`;

  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
