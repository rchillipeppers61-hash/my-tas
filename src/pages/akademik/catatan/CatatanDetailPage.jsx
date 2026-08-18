// src/pages/catatan/CatatanDetailPage.jsx
//
// Halaman semua catatan untuk 1 mata kuliah.
// - Panel "Catatan Baru": 3 cara capture dalam 1 baris ikon (CaptureBar =
//   rekam suara / foto / PDF) ATAU ketik manual di textarea
// - Auto-save saat mengetik (debounce), tanpa tombol simpan manual
// - Search + filter tag, buat manage catatan yang udah numpuk
// - Pin catatan penting -> selalu nangkring di atas
// - List catatan lama dikelompokin per rentang tanggal (Hari ini / Minggu
//   ini / Bulan ini / Lebih lama), bisa expand buat edit inline, hapus,
//   atau export PDF (tombol Export PDF sejajar heading "Catatan baru")
//
// Export PDF: generate & download langsung pakai jsPDF (lihat pdfExport.js),
// gak lewat window.print() -> gak ada dialog print yang interupsi, user
// tinggal klik dan file langsung ke-download. Install dulu: npm install jspdf
//
// CATATAN MIGRASI: fitur pin butuh kolom baru di tabel `catatan`:
//   alter table catatan add column pinned boolean not null default false;
// Kolom `tags` diasumsikan tipe text[] (array). Kalau tipe di database lo
// beda, sesuaikan bagian updateTags() & parsing di bawah.
//
// `user` diterima sebagai prop dari App.jsx (sama seperti CatatanPage.jsx).
// Route yang diasumsikan: /catatan/:mataKuliahId

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import CatatanCaptureBar from "./CatatanCaptureBar";
import {
  stripMarkdownSyntax,
  exportCatatanPdf,
  exportAllCatatanPdf,
} from "./pdfExport";
import ExportModal from "./ExportModal";

const AUTO_SAVE_DELAY_MS = 1200;

export default function CatatanDetailPage({ user }) {
  const { mataKuliahId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Deep-link dari landing page: ?catatanId=xxx -> auto-expand & scroll ke
  // catatan itu begitu data selesai dimuat. Diambil sekali di awal (ref),
  // gak ke-reset walaupun query param-nya kita bersihin dari URL nanti.
  const targetCatatanIdRef = useRef(searchParams.get("catatanId"));
  const scrolledToTargetRef = useRef(false);
  const [highlightId, setHighlightId] = useState(null);

  const [mataKuliah, setMataKuliah] = useState(null);
  const [catatanList, setCatatanList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [newText, setNewText] = useState("");
  const [creating, setCreating] = useState(false);
  const newTextareaRef = useRef(null);

  function handleImportDraft(text) {
    setNewText(text);
    // Auto-focus & scroll ke kotak teks biar user langsung liat & bisa
    // review/edit hasil importnya sebelum simpan.
    requestAnimationFrame(() => {
      newTextareaRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      newTextareaRef.current?.focus();
    });
  }

  // --- Search & filter tag ---
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState(() => new Set());

  useEffect(() => {
    if (!user?.id || !mataKuliahId) return;
    loadData();
  }, [user?.id, mataKuliahId]);

  // Deep-link: begitu catatan target ketemu di list, auto-expand + scroll +
  // kasih highlight sebentar, terus bersihin query param dari URL biar kalau
  // di-refresh gak ngulang-ngulang highlight-nya.
  useEffect(() => {
    const targetId = targetCatatanIdRef.current;
    if (!targetId || loading || scrolledToTargetRef.current) return;
    if (!catatanList.some((c) => c.id === targetId)) return;

    scrolledToTargetRef.current = true;
    setHighlightId(targetId);

    requestAnimationFrame(() => {
      document
        .getElementById(`catatan-${targetId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    if (searchParams.has("catatanId")) {
      const next = new URLSearchParams(searchParams);
      next.delete("catatanId");
      setSearchParams(next, { replace: true });
    }

    const t = setTimeout(() => setHighlightId(null), 2500);
    return () => clearTimeout(t);
  }, [catatanList, loading, searchParams, setSearchParams]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [{ data: mk, error: mkErr }, { data: catatan, error: catErr }] =
        await Promise.all([
          supabase
            .from("mata_kuliah")
            .select("id, nama, dosen, warna")
            .eq("id", mataKuliahId)
            .single(),
          supabase
            .from("catatan")
            .select("id, judul, isi, tags, pinned, created_at, updated_at")
            .eq("user_id", user.id)
            .eq("mata_kuliah_id", mataKuliahId)
            .order("updated_at", { ascending: false }),
        ]);

      if (mkErr) throw mkErr;
      if (catErr) throw catErr;

      setMataKuliah(mk);
      setCatatanList(catatan ?? []);
    } catch (err) {
      console.error(err);
      setError("Gagal memuat catatan. Coba refresh halaman.");
    } finally {
      setLoading(false);
    }
  }

  // --- Buat catatan baru ---

  async function saveNewCatatan(isiText) {
    if (!isiText || !isiText.trim()) return;
    setCreating(true);
    try {
      const { data, error: insertErr } = await supabase
        .from("catatan")
        .insert({
          user_id: user.id,
          mata_kuliah_id: mataKuliahId,
          isi: isiText.trim(),
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      setCatatanList((prev) => [data, ...prev]);
      setNewText("");
    } catch (err) {
      console.error(err);
      setError("Gagal menyimpan catatan baru.");
    } finally {
      setCreating(false);
    }
  }

  function handleRecorderResult({ catatan }) {
    // Hasil AI langsung disimpan sebagai catatan baru.
    saveNewCatatan(catatan);
  }

  // --- Export PDF ---

  // Modal pilih catatan yang mau di-export. Kalau yang dipilih cuma 1,
  // export single PDF; kalau lebih, digabung jadi 1 PDF kronologis.
  const [showExportModal, setShowExportModal] = useState(false);

  function handleExportSelection(selected) {
    try {
      if (selected.length === 1) {
        const c = selected[0];
        exportCatatanPdf({
          judul: mataKuliah?.nama
            ? `Catatan - ${mataKuliah.nama}`
            : "Catatan Kuliah",
          subjudul: mataKuliah?.dosen ?? "",
          tanggal: formatDateTime(c.updated_at),
          isi: c.isi,
        });
      } else {
        const sorted = [...selected].sort(
          (a, b) => new Date(a.updated_at) - new Date(b.updated_at),
        );
        exportAllCatatanPdf({
          matkulNama: mataKuliah?.nama || "Catatan Kuliah",
          dosen: mataKuliah?.dosen ?? "",
          catatanList: sorted.map((c) => ({
            tanggal: formatDateTime(c.updated_at),
            isi: c.isi,
          })),
        });
      }
      setShowExportModal(false);
    } catch (err) {
      console.error(err);
      setError("Gagal export PDF. Coba lagi.");
    }
  }

  // --- Search + filter tag + grouping ---

  // Semua tag unik yang pernah dipakai di mata kuliah ini, buat chip filter.
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

  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return catatanList.filter((c) => {
      const matchesSearch =
        !q || stripMarkdownSyntax(c.isi).toLowerCase().includes(q);
      const cTags = Array.isArray(c.tags) ? c.tags : [];
      const matchesTags =
        selectedTags.size === 0 || cTags.some((t) => selectedTags.has(t));
      return matchesSearch && matchesTags;
    });
  }, [catatanList, searchQuery, selectedTags]);

  const pinnedList = useMemo(
    () => filteredList.filter((c) => c.pinned),
    [filteredList],
  );
  const unpinnedGroups = useMemo(
    () => groupCatatanByDate(filteredList.filter((c) => !c.pinned)),
    [filteredList],
  );

  const isFiltering = searchQuery.trim() !== "" || selectedTags.size > 0;
  const hasAnyResult = filteredList.length > 0;

  function clearFilters() {
    setSearchQuery("");
    setSelectedTags(new Set());
  }

  return (
    <div className="min-h-screen bg-violet-50 px-4 py-6 sm:px-6 md:px-10 md:py-12">
      <div className="mx-auto max-w-3xl">
        <button
          onClick={() => navigate("/journal")}
          className="text-sm font-medium text-violet-600 hover:underline">
          ← Semua mata kuliah
        </button>

        {mataKuliah && (
          <div>
            <h1 className="mt-2 font-serif text-xl font-bold text-slate-900 sm:text-2xl md:text-3xl">
              {mataKuliah.nama}
            </h1>
            {mataKuliah.dosen && (
              <p className="mt-1 text-slate-500">{mataKuliah.dosen}</p>
            )}
          </div>
        )}

        {/* Panel capture cepat */}
        <div className="mt-6 rounded-2xl bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-700">
              Catatan Baru
            </h2>

            {catatanList.length > 0 && (
              <button
                onClick={() => setShowExportModal(true)}
                className="flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-full border border-violet-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-violet-700 shadow-sm transition hover:bg-violet-50">
                <DownloadIcon />
                Export PDF
              </button>
            )}
          </div>

          <div className="mt-4">
            <CatatanCaptureBar
              namaMataKuliah={mataKuliah?.nama}
              onRecordResult={handleRecorderResult}
              onDraftReady={handleImportDraft}
              onError={(msg) => setError(msg)}
            />
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-100" />
            <span className="text-xs text-slate-400">Atau Ketik Manual</span>
            <div className="h-px flex-1 bg-slate-100" />
          </div>

          <textarea
            ref={newTextareaRef}
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Tulis catatan cepat di sini..."
            rows={6}
            className="mt-3 w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-800 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={() => saveNewCatatan(newText)}
              disabled={creating || !newText.trim()}
              className="min-h-[40px] rounded-full bg-violet-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40">
              {creating ? "Menyimpan..." : "Simpan catatan"}
            </button>
            {newText.trim() && !creating && (
              <button
                onClick={() => setNewText("")}
                className="min-h-[40px] rounded-full px-5 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100">
                Batal
              </button>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Search + filter tag */}
        {!loading && catatanList.length > 0 && (
          <div className="mt-8">
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <SearchIcon />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari isi catatan..."
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
                <span>
                  {filteredList.length} dari {catatanList.length} catatan
                </span>
                <button
                  onClick={clearFilters}
                  className="font-semibold text-violet-600 hover:underline">
                  Reset filter
                </button>
              </div>
            )}
          </div>
        )}

        {/* List catatan */}
        <div className="mt-6">
          {loading && <LoadingList />}

          {!loading && catatanList.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-400">
              Belum ada catatan untuk mata kuliah ini.
            </p>
          )}

          {!loading && catatanList.length > 0 && !hasAnyResult && (
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
          )}

          {!loading && hasAnyResult && (
            <div className="flex flex-col gap-6">
              {pinnedList.length > 0 && (
                <CatatanSection
                  label="📌 Disematkan"
                  items={pinnedList}
                  onDeleted={handleCatatanDeleted}
                  onUpdated={handleCatatanUpdated}
                  allTags={allTags}
                  autoExpandId={targetCatatanIdRef.current}
                  highlightId={highlightId}
                />
              )}

              {GROUP_ORDER.filter((key) => unpinnedGroups[key].length > 0).map(
                (key) => (
                  <CatatanSection
                    key={key}
                    label={GROUP_LABELS[key]}
                    items={unpinnedGroups[key]}
                    onDeleted={handleCatatanDeleted}
                    onUpdated={handleCatatanUpdated}
                    allTags={allTags}
                    autoExpandId={targetCatatanIdRef.current}
                    highlightId={highlightId}
                  />
                ),
              )}
            </div>
          )}
        </div>
      </div>

      <ExportModal
        open={showExportModal}
        catatanList={catatanList}
        onClose={() => setShowExportModal(false)}
        onConfirm={handleExportSelection}
      />
    </div>
  );

  function handleCatatanDeleted(id) {
    setCatatanList((prev) => prev.filter((x) => x.id !== id));
  }

  function handleCatatanUpdated(updated) {
    setCatatanList((prev) =>
      prev.map((x) => (x.id === updated.id ? updated : x)),
    );
  }
}

// --- Grouping by tanggal ---

const GROUP_ORDER = ["today", "week", "month", "older"];
const GROUP_LABELS = {
  today: "Hari ini",
  week: "Minggu ini",
  month: "Bulan ini",
  older: "Lebih lama",
};

function groupCatatanByDate(list) {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const groups = { today: [], week: [], month: [], older: [] };
  list.forEach((c) => {
    const d = new Date(c.updated_at);
    if (d >= startOfToday) groups.today.push(c);
    else if (d >= startOfWeek) groups.week.push(c);
    else if (d >= startOfMonth) groups.month.push(c);
    else groups.older.push(c);
  });
  return groups;
}

function CatatanSection({
  label,
  items,
  onDeleted,
  onUpdated,
  allTags,
  autoExpandId,
  highlightId,
}) {
  return (
    <div>
      <h3 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </h3>
      <div className="flex flex-col gap-3">
        {items.map((c) => (
          <CatatanCard
            key={c.id}
            catatan={c}
            onDeleted={onDeleted}
            onUpdated={onUpdated}
            allTags={allTags}
            autoExpandId={autoExpandId}
            highlightId={highlightId}
          />
        ))}
      </div>
    </div>
  );
}

function CatatanCard({
  catatan,
  onDeleted,
  onUpdated,
  allTags,
  autoExpandId,
  highlightId,
}) {
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState(catatan.isi);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved
  const [tagInput, setTagInput] = useState("");
  const saveTimerRef = useRef(null);

  const tags = Array.isArray(catatan.tags) ? catatan.tags : [];

  // Deep-link dari landing page: kalau ini catatan yang dituju, langsung
  // expand otomatis biar isinya kebaca tanpa perlu klik lagi.
  useEffect(() => {
    if (autoExpandId && autoExpandId === catatan.id) {
      setExpanded(true);
    }
  }, [autoExpandId, catatan.id]);

  function handleChange(value) {
    setText(value);
    setSaveState("idle");
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(
      () => autoSave(value),
      AUTO_SAVE_DELAY_MS,
    );
  }

  async function autoSave(value) {
    setSaveState("saving");
    try {
      const { data, error } = await supabase
        .from("catatan")
        .update({ isi: value })
        .eq("id", catatan.id)
        .select()
        .single();

      if (error) throw error;
      onUpdated(data);
      setSaveState("saved");
    } catch (err) {
      console.error(err);
      setSaveState("idle");
    }
  }

  async function handleDelete() {
    if (!confirm("Hapus catatan ini?")) return;
    try {
      const { error } = await supabase
        .from("catatan")
        .delete()
        .eq("id", catatan.id);
      if (error) throw error;
      onDeleted(catatan.id);
    } catch (err) {
      console.error(err);
      alert("Gagal menghapus catatan.");
    }
  }

  async function handleTogglePin(e) {
    e.stopPropagation();
    try {
      const { data, error } = await supabase
        .from("catatan")
        .update({ pinned: !catatan.pinned })
        .eq("id", catatan.id)
        .select()
        .single();
      if (error) throw error;
      onUpdated(data);
    } catch (err) {
      console.error(err);
      alert(
        "Gagal update pin. Pastikan kolom `pinned` sudah dibuat di tabel catatan.",
      );
    }
  }

  async function persistTags(newTags) {
    try {
      const { data, error } = await supabase
        .from("catatan")
        .update({ tags: newTags })
        .eq("id", catatan.id)
        .select()
        .single();
      if (error) throw error;
      onUpdated(data);
    } catch (err) {
      console.error(err);
      alert("Gagal update tag.");
    }
  }

  function addTag() {
    const t = tagInput.trim().replace(/^#/, "");
    if (!t) return;
    if (tags.includes(t)) {
      setTagInput("");
      return;
    }
    persistTags([...tags, t]);
    setTagInput("");
  }

  function removeTag(t) {
    persistTags(tags.filter((x) => x !== t));
  }

  // Preview list pakai versi bersih (syntax markdown di-strip), biar gak
  // keliatan "##"/"**" mentah pas belum di-expand.
  const cleanPreview = stripMarkdownSyntax(catatan.isi);
  const preview = cleanPreview.slice(0, 140);
  const isHighlighted = highlightId === catatan.id;

  return (
    <div
      id={`catatan-${catatan.id}`}
      className={`rounded-2xl bg-white p-4 shadow-sm transition-shadow duration-500 sm:p-5 ${
        isHighlighted ? "ring-2 ring-violet-400" : ""
      }`}>
      <div className="flex items-start justify-between gap-2">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <p className="text-xs text-slate-400">
              {formatDateTime(catatan.updated_at)}
            </p>
            {catatan.pinned && (
              <span className="text-xs font-semibold text-violet-600">
                • Disematkan
              </span>
            )}
          </div>
          {!expanded && (
            <>
              <p className="mt-1 whitespace-pre-line text-slate-700">
                {preview}
                {cleanPreview.length > 140 ? "…" : ""}
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
            </>
          )}
        </button>

        <div className="flex shrink-0 items-center gap-1">
          {expanded && saveState === "saving" && (
            <span className="mr-1 text-xs text-slate-400">Menyimpan...</span>
          )}
          {expanded && saveState === "saved" && (
            <span className="mr-1 text-xs text-emerald-600">Tersimpan</span>
          )}
          <button
            onClick={handleTogglePin}
            aria-label={catatan.pinned ? "Lepas pin" : "Sematkan catatan"}
            className="flex h-9 w-9 items-center justify-center rounded-full transition"
            style={{
              color: catatan.pinned ? "#7c3aed" : "#94a3b8",
              background: catatan.pinned ? "#7c3aed1a" : "transparent",
            }}>
            <PinIcon filled={catatan.pinned} />
          </button>
          <button
            onClick={handleDelete}
            className="flex h-9 items-center rounded-full px-2 text-xs font-medium text-red-400 hover:bg-red-50 hover:text-red-600"
            aria-label="Hapus catatan">
            Hapus
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3">
          <textarea
            value={text}
            onChange={(e) => handleChange(e.target.value)}
            rows={8}
            className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
          />

          {/* Tag editor */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {tags.map((t) => (
              <span
                key={t}
                className="flex items-center gap-1 rounded-full bg-violet-50 py-1 pl-2.5 pr-1.5 text-xs font-medium text-violet-600">
                #{t}
                <button
                  onClick={() => removeTag(t)}
                  aria-label={`Hapus tag ${t}`}
                  className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-violet-100">
                  <CloseIcon size={10} />
                </button>
              </span>
            ))}
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="+ tambah tag"
              list="tag-suggestions"
              className="min-w-[90px] flex-1 rounded-full border border-dashed border-slate-200 px-2.5 py-1 text-xs text-slate-600 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none"
            />
            <datalist id="tag-suggestions">
              {allTags.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
        </div>
      )}
    </div>
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

function PinIcon({ filled }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round">
      <path d="M12 17v5" />
      <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16h14v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a1 1 0 0 0 0-2H8a1 1 0 0 0 0 2h1z" />
    </svg>
  );
}

function CloseIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
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

function DownloadIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function LoadingList() {
  return (
    <div className="flex flex-col gap-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/70" />
      ))}
    </div>
  );
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
