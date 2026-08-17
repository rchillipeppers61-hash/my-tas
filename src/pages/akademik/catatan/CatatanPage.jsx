// src/pages/catatan/CatatanPage.jsx
//
// Landing page module Catatan Kuliah.
// Nampilin daftar mata kuliah (dari tabel `mata_kuliah`) beserta jumlah
// catatan yang udah ditulis di tiap mata kuliah. Klik card -> masuk ke
// daftar catatan mata kuliah itu (CatatanDetailPage).
//
// Selain itu ada 2 fitur "manage catatan lintas matkul":
// - Search + filter tag global: nyari isi catatan di SEMUA matkul sekaligus,
//   hasil ditampilin flat dengan badge nama matkul, klik -> masuk ke matkul
//   yang bersangkutan.
// - Quick section "Disematkan": nampilin catatan yang di-pin dari semua
//   matkul, biar gampang diakses tanpa harus masuk ke matkul dulu.
//
// Sama seperti WalletPage / AkademikPage, `user` diterima sebagai prop
// dari App.jsx (bukan dari hook auth), karena project ini pakai session
// custom lewat localStorage, bukan Supabase Auth.
//
// ASUMSI: supabaseClient.js punya `export default supabase`
// ASUMSI: kolom `pinned` (boolean) & `tags` (text[]) sudah ada di tabel
// `catatan` -- lihat catatan migrasi di CatatanDetailPage.jsx

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import { stripMarkdownSyntax } from "./pdfExport";

export default function CatatanPage({ user }) {
  const navigate = useNavigate();

  const [mataKuliahList, setMataKuliahList] = useState([]);
  const [catatanList, setCatatanList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // --- Search & filter tag (lintas semua matkul) ---
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState(() => new Set());

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

      // 2. Ambil semua catatan milik user. Ikut ambil isi/tags/pinned juga
      // (bukan cuma id & updated_at kayak sebelumnya) karena dipakai buat
      // search & quick-access pinned di halaman ini.
      const { data: catatan, error: catatanError } = await supabase
        .from("catatan")
        .select("id, mata_kuliah_id, isi, tags, pinned, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

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
      setCatatanList(catatan ?? []);
    } catch (err) {
      console.error(err);
      setError("Gagal memuat data catatan. Coba refresh halaman.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteMataKuliah(id) {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    setDeletingId(id);
    try {
      const { error: deleteError } = await supabase
        .from("mata_kuliah")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (deleteError) throw deleteError;
      setMataKuliahList((prev) => prev.filter((mk) => mk.id !== id));
      setCatatanList((prev) => prev.filter((c) => c.mata_kuliah_id !== id));
    } catch (err) {
      console.error(err);
      alert(
        "Gagal menghapus mata kuliah. Mungkin masih dipakai di jadwal/tugas lain.",
      );
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  // --- Search + filter tag global ---

  const mataKuliahById = useMemo(() => {
    const map = {};
    mataKuliahList.forEach((mk) => {
      map[mk.id] = mk;
    });
    return map;
  }, [mataKuliahList]);

  const allTags = useMemo(() => {
    const set = new Set();
    catatanList.forEach((c) => {
      (Array.isArray(c.tags) ? c.tags : []).forEach((t) => set.add(t));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [catatanList]);

  function toggleTagFilter(tag) {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  const isFiltering = searchQuery.trim() !== "" || selectedTags.size > 0;

  const searchResults = useMemo(() => {
    if (!isFiltering) return [];
    const q = searchQuery.trim().toLowerCase();
    return catatanList.filter((c) => {
      const matchesSearch =
        !q || stripMarkdownSyntax(c.isi).toLowerCase().includes(q);
      const cTags = Array.isArray(c.tags) ? c.tags : [];
      const matchesTags =
        selectedTags.size === 0 || cTags.some((t) => selectedTags.has(t));
      return matchesSearch && matchesTags;
    });
  }, [catatanList, searchQuery, selectedTags, isFiltering]);

  function clearFilters() {
    setSearchQuery("");
    setSelectedTags(new Set());
  }

  // --- Quick access: catatan yang di-pin, lintas semua matkul ---

  const pinnedCatatan = useMemo(
    () => catatanList.filter((c) => c.pinned),
    [catatanList],
  );

  function goToCatatan(c) {
    // catatanId dibaca CatatanDetailPage buat auto-expand & scroll ke
    // catatan ini pas halamannya kebuka.
    navigate(`/journal/${c.mata_kuliah_id}?catatanId=${c.id}`);
  }

  const showBrowseState = !isFiltering;

  return (
    <div className="min-h-screen bg-violet-50 px-4 py-6 sm:px-6 md:px-10 md:py-12">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <h1 className="font-serif text-xl font-bold text-slate-900 md:text-2xl">
          Catatan Kuliah 📝
        </h1>

        {/* Search + filter tag global */}
        {!loading && !error && catatanList.length > 0 && (
          <div className="mt-5">
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <SearchIcon />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari catatan di semua mata kuliah..."
                className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-11 pr-10 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  aria-label="Bersihkan pencarian"
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                  <CloseIcon />
                </button>
              )}
            </div>

            {allTags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {allTags.map((tag) => {
                  const active = selectedTags.has(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleTagFilter(tag)}
                      className="min-h-[32px] rounded-full px-3 py-1 text-xs font-semibold transition"
                      style={{
                        background: active ? "#7c3aed" : "#7c3aed14",
                        color: active ? "#FFFFFF" : "#6d28d9",
                      }}>
                      #{tag}
                    </button>
                  );
                })}
              </div>
            )}

            {isFiltering && (
              <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                <span>{searchResults.length} catatan ditemukan</span>
                <button
                  onClick={clearFilters}
                  className="font-semibold text-violet-600 hover:underline">
                  Reset filter
                </button>
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="mt-6">
          {loading && <LoadingGrid />}

          {!loading && error && (
            <ErrorState message={error} onRetry={loadData} />
          )}

          {/* Hasil search/filter, flat lintas matkul */}
          {!loading && !error && isFiltering && (
            <>
              {searchResults.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-slate-400">
                    Gak ada catatan yang cocok.
                  </p>
                  <button
                    onClick={clearFilters}
                    className="mt-2 text-sm font-semibold text-violet-600 hover:underline">
                    Reset filter
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {searchResults.map((c) => (
                    <SearchResultCard
                      key={c.id}
                      catatan={c}
                      mataKuliah={mataKuliahById[c.mata_kuliah_id]}
                      onClick={() => goToCatatan(c)}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Browse normal: pinned quick section + grid matkul */}
          {!loading && !error && showBrowseState && (
            <>
              {pinnedCatatan.length > 0 && (
                <div className="mb-8">
                  <h3 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-slate-400">
                    📌 Disematkan
                  </h3>
                  <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
                    {pinnedCatatan.map((c) => (
                      <PinnedQuickCard
                        key={c.id}
                        catatan={c}
                        mataKuliah={mataKuliahById[c.mata_kuliah_id]}
                        onClick={() => goToCatatan(c)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {mataKuliahList.length === 0 && <EmptyState />}

              {mataKuliahList.length > 0 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {mataKuliahList.map((mk) => (
                    <MataKuliahCard
                      key={mk.id}
                      mataKuliah={mk}
                      onClick={() => navigate(`/journal/${mk.id}`)}
                      onDelete={() => handleDeleteMataKuliah(mk.id)}
                      deleting={deletingId === mk.id}
                      confirming={confirmDeleteId === mk.id}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MataKuliahCard({
  mataKuliah,
  onClick,
  onDelete,
  deleting,
  confirming,
}) {
  const { nama, dosen, warna, jumlahCatatan, lastUpdated } = mataKuliah;
  const accent = warna || "#7c3aed"; // fallback violet-600

  return (
    <div
      className="group relative flex w-full flex-col rounded-2xl bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      style={{ border: `2px solid ${accent}80` }}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        disabled={deleting}
        aria-label="Hapus mata kuliah"
        className="absolute right-3 top-3 z-10 flex min-h-[36px] min-w-[36px] items-center justify-center rounded-full px-2.5 text-[11px] font-semibold transition-colors disabled:opacity-50"
        style={{
          background: confirming ? "#D9607A" : "#D9607A17",
          color: confirming ? "#FFFFFF" : "#D9607A",
        }}>
        {deleting ? "..." : confirming ? "Yakin?" : <TrashIcon />}
      </button>

      <button
        onClick={onClick}
        className="flex flex-1 flex-col text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-xl">
        <div className="flex items-start justify-between gap-2 pr-9">
          <h2 className="font-serif text-lg font-bold text-slate-900">
            {nama}
          </h2>
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
    </div>
  );
}

// Card hasil search: flat lintas matkul, dikasih badge nama matkul biar
// jelas asalnya, plus preview isi & tag.
function SearchResultCard({ catatan, mataKuliah, onClick }) {
  const accent = mataKuliah?.warna || "#7c3aed";
  const cleanPreview = stripMarkdownSyntax(catatan.isi);
  const preview = cleanPreview.slice(0, 160);
  const tags = Array.isArray(catatan.tags) ? catatan.tags : [];

  return (
    <button
      onClick={onClick}
      className="flex w-full flex-col rounded-2xl bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{ backgroundColor: `${accent}1a`, color: accent }}>
          {mataKuliah?.nama || "Mata kuliah"}
        </span>
        <span className="text-xs text-slate-400">
          {formatRelativeDate(new Date(catatan.updated_at))}
        </span>
      </div>
      <p className="mt-2 whitespace-pre-line text-sm text-slate-700">
        {preview}
        {cleanPreview.length > 160 ? "…" : ""}
      </p>
      {tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-600">
              #{t}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

// Card kecil buat quick-access catatan yang di-pin, scroll horizontal di mobile.
function PinnedQuickCard({ catatan, mataKuliah, onClick }) {
  const accent = mataKuliah?.warna || "#7c3aed";
  const cleanPreview = stripMarkdownSyntax(catatan.isi);
  const preview = cleanPreview.slice(0, 80);

  return (
    <button
      onClick={onClick}
      className="flex w-60 shrink-0 flex-col rounded-2xl bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:w-64">
      <span
        className="w-fit shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold"
        style={{ backgroundColor: `${accent}1a`, color: accent }}>
        {mataKuliah?.nama || "Mata kuliah"}
      </span>
      <p className="mt-2 whitespace-pre-line text-sm text-slate-700">
        {preview}
        {cleanPreview.length > 80 ? "…" : ""}
      </p>
    </button>
  );
}

function TrashIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 6V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
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
    <div
      className="rounded-2xl bg-white px-6 py-14 text-center"
      style={{ border: "2px dashed #C4B5FD" }}>
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
    <div
      className="rounded-2xl bg-red-50 px-6 py-8 text-center"
      style={{ border: "2px solid #FECACA" }}>
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
