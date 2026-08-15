// src/pages/catatan/CatatanDetailPage.jsx
//
// Halaman semua catatan untuk 1 mata kuliah.
// - Panel "Catatan Baru": rekam suara (RecorderWidget) ATAU ketik manual
// - Auto-save saat mengetik (debounce), tanpa tombol simpan manual
// - List catatan lama, bisa expand buat edit inline, atau hapus
//
// `user` diterima sebagai prop dari App.jsx (sama seperti CatatanPage.jsx).
// Route yang diasumsikan: /catatan/:mataKuliahId

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import RecorderWidget from "./RecorderWidget";

const AUTO_SAVE_DELAY_MS = 1200;

export default function CatatanDetailPage({ user }) {
  const { mataKuliahId } = useParams();
  const navigate = useNavigate();

  const [mataKuliah, setMataKuliah] = useState(null);
  const [catatanList, setCatatanList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [newText, setNewText] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user?.id || !mataKuliahId) return;
    loadData();
  }, [user?.id, mataKuliahId]);

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
            .select("id, judul, isi, tags, created_at, updated_at")
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

  return (
    <div className="min-h-screen bg-violet-50 px-5 py-8 md:px-10 md:py-12">
      <div className="mx-auto max-w-3xl">
        <button
          onClick={() => navigate("/journal")}
          className="text-sm font-medium text-violet-600 hover:underline">
          ← Semua mata kuliah
        </button>

        {mataKuliah && (
          <>
            <h1 className="mt-2 font-serif text-2xl font-bold text-slate-900 md:text-3xl">
              {mataKuliah.nama}
            </h1>
            {mataKuliah.dosen && (
              <p className="mt-1 text-slate-500">{mataKuliah.dosen}</p>
            )}
          </>
        )}

        {/* Panel capture cepat */}
        <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700">Catatan baru</h2>

          <div className="mt-3">
            <RecorderWidget
              namaMataKuliah={mataKuliah?.nama}
              onResult={handleRecorderResult}
              onError={(msg) => setError(msg)}
            />
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-100" />
            <span className="text-xs text-slate-400">atau ketik manual</span>
            <div className="h-px flex-1 bg-slate-100" />
          </div>

          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Tulis catatan cepat di sini..."
            rows={4}
            className="mt-3 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-800 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
          />
          <button
            onClick={() => saveNewCatatan(newText)}
            disabled={creating || !newText.trim()}
            className="mt-2 rounded-full bg-violet-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40">
            {creating ? "Menyimpan..." : "Simpan catatan"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* List catatan */}
        <div className="mt-8">
          {loading && <LoadingList />}

          {!loading && catatanList.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-400">
              Belum ada catatan untuk mata kuliah ini.
            </p>
          )}

          {!loading && catatanList.length > 0 && (
            <div className="flex flex-col gap-3">
              {catatanList.map((c) => (
                <CatatanCard
                  key={c.id}
                  catatan={c}
                  onDeleted={(id) =>
                    setCatatanList((prev) => prev.filter((x) => x.id !== id))
                  }
                  onUpdated={(updated) =>
                    setCatatanList((prev) =>
                      prev.map((x) => (x.id === updated.id ? updated : x)),
                    )
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CatatanCard({ catatan, onDeleted, onUpdated }) {
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState(catatan.isi);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved
  const saveTimerRef = useRef(null);

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

  const preview = catatan.isi.slice(0, 140);

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 text-left">
          <p className="text-xs text-slate-400">
            {formatDateTime(catatan.updated_at)}
          </p>
          {!expanded && (
            <p className="mt-1 whitespace-pre-line text-slate-700">
              {preview}
              {catatan.isi.length > 140 ? "…" : ""}
            </p>
          )}
        </button>

        <div className="flex shrink-0 items-center gap-2">
          {expanded && saveState === "saving" && (
            <span className="text-xs text-slate-400">Menyimpan...</span>
          )}
          {expanded && saveState === "saved" && (
            <span className="text-xs text-emerald-600">Tersimpan</span>
          )}
          <button
            onClick={handleDelete}
            className="text-xs text-red-400 hover:text-red-600"
            aria-label="Hapus catatan">
            Hapus
          </button>
        </div>
      </div>

      {expanded && (
        <textarea
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          rows={8}
          className="mt-3 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
        />
      )}
    </div>
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
