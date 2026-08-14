import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import { C, FONT_IMPORT } from "../../lib/theme";
import { STATUS_TUGAS, PRIORITAS } from "./constants";

const inputClass =
  "w-full mt-1.5 mb-3.5 px-3.5 py-3 rounded-2xl text-[15px] outline-none border-[1.5px] transition-shadow focus:ring-4 focus:ring-[#8B72C42A]";
const inputStyle = {
  background: "#463F5C08",
  color: C.ink,
  borderColor: "#463F5C1F",
};

// Cocok sama format yang dipakai TugasPage buat nampilin nama mata
// kuliah manual dari dalam kolom catatan.
const MANUAL_PREFIX_RE = /^Mata kuliah: (.+)\n?\n?/;

function splitCatatan(catatan) {
  if (!catatan) return { manualNama: "", sisaCatatan: "" };
  const match = catatan.match(MANUAL_PREFIX_RE);
  if (!match) return { manualNama: "", sisaCatatan: catatan };
  return {
    manualNama: match[1],
    sisaCatatan: catatan.slice(match[0].length),
  };
}

// ============================================================
// TugasFormPage — tambah/edit tugas. Mata kuliah bisa dipilih dari
// dropdown (tersambung ke mata_kuliah_id) atau ketik manual (nama
// disimpen di baris pertama `catatan`, lihat catatan di file ini
// & di chat -- skema tugas belum punya kolom khusus utk itu).
// ============================================================
export default function TugasFormPage({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const editing = location.state?.tugas || null;
  const isEditing = Boolean(editing);

  const existingSplit = splitCatatan(editing?.catatan);

  const [mataKuliahList, setMataKuliahList] = useState([]);
  const [loadingMk, setLoadingMk] = useState(true);
  const [mode, setMode] = useState(
    editing ? (editing.mata_kuliah_id ? "dropdown" : "manual") : "dropdown",
  );

  const [judul, setJudul] = useState(editing?.judul || "");
  const [selectedMkId, setSelectedMkId] = useState(
    editing?.mata_kuliah_id || "",
  );
  const [manualNama, setManualNama] = useState(existingSplit.manualNama);
  const [deadline, setDeadline] = useState(
    editing?.deadline ? toLocalInputValue(editing.deadline) : "",
  );
  const [prioritas, setPrioritas] = useState(editing?.prioritas || "sedang");
  const [status, setStatus] = useState(editing?.status || "belum");
  const [catatan, setCatatan] = useState(existingSplit.sisaCatatan);

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    async function fetchMk() {
      setLoadingMk(true);
      const { data, error: fetchError } = await supabase
        .from("mata_kuliah")
        .select("id, nama")
        .eq("user_id", user.id)
        .order("nama", { ascending: true });
      if (!fetchError) setMataKuliahList(data || []);
      setLoadingMk(false);
    }
    fetchMk();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toLocalInputValue(iso) {
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours(),
    )}:${pad(d.getMinutes())}`;
  }

  async function handleSave() {
    setError("");

    if (!judul.trim()) {
      setError("Isi judul tugasnya dulu ya.");
      return;
    }
    if (!deadline) {
      setError("Pilih tanggal & jam deadline dulu.");
      return;
    }
    if (mode === "dropdown" && !selectedMkId) {
      setError("Pilih mata kuliahnya, atau pindah ke mode ketik manual.");
      return;
    }
    if (mode === "manual" && !manualNama.trim()) {
      setError("Isi nama mata kuliahnya dulu.");
      return;
    }

    setSaving(true);

    const finalCatatan =
      mode === "manual"
        ? `Mata kuliah: ${manualNama.trim()}${catatan.trim() ? `\n\n${catatan.trim()}` : ""}`
        : catatan.trim() || null;

    const payload = {
      user_id: user.id,
      mata_kuliah_id: mode === "dropdown" ? selectedMkId : null,
      judul: judul.trim(),
      deadline: new Date(deadline).toISOString(),
      prioritas,
      status,
      catatan: finalCatatan,
    };

    const { error: saveError } = isEditing
      ? await supabase
          .from("tugas")
          .update(payload)
          .eq("id", editing.id)
          .eq("user_id", user.id)
      : await supabase.from("tugas").insert(payload);

    setSaving(false);

    if (saveError) {
      setError("Gagal menyimpan tugas, coba lagi.");
      return;
    }

    navigate("/akademik/tugas");
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    const { error: deleteError } = await supabase
      .from("tugas")
      .delete()
      .eq("id", editing.id)
      .eq("user_id", user.id);
    setDeleting(false);
    if (!deleteError) {
      navigate("/akademik/tugas");
    } else {
      setError("Gagal menghapus tugas, coba lagi.");
      setConfirmDelete(false);
    }
  }

  return (
    <div
      className="max-w-lg mx-auto px-4 sm:px-6 py-8 sm:py-10 pb-16"
      style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{FONT_IMPORT}</style>

      <button
        onClick={() => navigate("/akademik/tugas")}
        className="text-[12.5px] font-semibold mb-4 -ml-1 px-1 py-2 flex items-center gap-1"
        style={{ color: C.roseDeep }}>
        ← Kembali
      </button>

      <h1
        style={{ fontFamily: "'Fraunces', serif", color: C.ink }}
        className="text-[22px] font-semibold mb-1">
        {isEditing ? "Edit Tugas" : "Tambah Tugas"}
      </h1>
      <p className="text-[12.5px] mb-6" style={{ color: C.inkFaint }}>
        Catat tugas & deadline-nya biar gak kelewat.
      </p>

      <label
        className="text-[11px] uppercase tracking-wide font-bold"
        style={{ color: C.inkFaint }}>
        Judul Tugas
      </label>
      <input
        type="text"
        value={judul}
        onChange={(e) => setJudul(e.target.value)}
        placeholder="Laporan Praktikum Fisika Dasar"
        className={inputClass}
        style={inputStyle}
      />

      <label
        className="text-[11px] uppercase tracking-wide font-bold"
        style={{ color: C.inkFaint }}>
        Mata Kuliah
      </label>
      <div
        className="flex rounded-2xl p-1.5 mt-1.5 mb-3 gap-1.5"
        style={{ background: "#463F5C0d" }}>
        {[
          { key: "dropdown", label: "Pilih dari Daftar" },
          { key: "manual", label: "Ketik Manual" },
        ].map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setMode(opt.key)}
            className="flex-1 py-3 rounded-xl text-[12.5px] font-bold transition-all"
            style={{
              background: mode === opt.key ? C.roseDeep : "transparent",
              color: mode === opt.key ? "#FFFFFF" : C.inkSoft,
            }}>
            {opt.label}
          </button>
        ))}
      </div>

      {mode === "dropdown" ? (
        <div className="relative">
          <select
            value={selectedMkId}
            onChange={(e) => setSelectedMkId(e.target.value)}
            disabled={loadingMk}
            className={`${inputClass} appearance-none pr-9`}
            style={inputStyle}>
            <option value="">
              {loadingMk ? "Memuat..." : "Pilih mata kuliah"}
            </option>
            {mataKuliahList.map((mk) => (
              <option key={mk.id} value={mk.id}>
                {mk.nama}
              </option>
            ))}
          </select>
          <span
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 -mt-1.5 text-[12px]"
            style={{ color: C.inkFaint }}>
            ▾
          </span>
        </div>
      ) : (
        <input
          type="text"
          value={manualNama}
          onChange={(e) => setManualNama(e.target.value)}
          placeholder="Contoh: Workshop Non-SKS"
          className={inputClass}
          style={inputStyle}
        />
      )}

      <label
        className="text-[11px] uppercase tracking-wide font-bold"
        style={{ color: C.inkFaint }}>
        Deadline
      </label>
      <input
        type="datetime-local"
        value={deadline}
        onChange={(e) => setDeadline(e.target.value)}
        className={inputClass}
        style={inputStyle}
      />

      <label
        className="text-[11px] uppercase tracking-wide font-bold"
        style={{ color: C.inkFaint }}>
        Prioritas
      </label>
      <div className="grid grid-cols-3 gap-2 mt-1.5 mb-3.5">
        {PRIORITAS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setPrioritas(p.value)}
            className="py-3 rounded-2xl text-[12.5px] font-bold border-[1.5px] transition-colors"
            style={{
              background: prioritas === p.value ? p.color : "#463F5C08",
              color: prioritas === p.value ? "#FFFFFF" : C.ink,
              borderColor: prioritas === p.value ? p.color : "#463F5C1F",
            }}>
            {p.label}
          </button>
        ))}
      </div>

      {isEditing && (
        <>
          <label
            className="text-[11px] uppercase tracking-wide font-bold"
            style={{ color: C.inkFaint }}>
            Status
          </label>
          <div className="grid grid-cols-3 gap-2 mt-1.5 mb-3.5">
            {STATUS_TUGAS.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setStatus(s.value)}
                className="py-3 rounded-2xl text-[11.5px] font-bold border-[1.5px] transition-colors"
                style={{
                  background: status === s.value ? s.color : "#463F5C08",
                  color: status === s.value ? "#FFFFFF" : C.ink,
                  borderColor: status === s.value ? s.color : "#463F5C1F",
                }}>
                {s.icon} {s.label}
              </button>
            ))}
          </div>
        </>
      )}

      <label
        className="text-[11px] uppercase tracking-wide font-bold"
        style={{ color: C.inkFaint }}>
        Catatan (opsional)
      </label>
      <textarea
        value={catatan}
        onChange={(e) => setCatatan(e.target.value)}
        placeholder="Detail tambahan, link tugas, dll."
        rows={3}
        className={`${inputClass} mb-2 resize-none`}
        style={inputStyle}
      />

      {error && (
        <div
          className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 mb-3.5 text-[12px] font-medium"
          style={{ background: "#F4A6B71F", color: C.roseDeep }}>
          ⚠️ {error}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving || deleting}
        className="w-full py-3.5 rounded-2xl font-bold text-[14px] disabled:opacity-50"
        style={{
          background: `linear-gradient(135deg, ${C.roseDeep}, ${C.rose})`,
          color: "#FFFFFF",
          boxShadow: "0 14px 28px -14px rgba(217,96,122,0.6)",
        }}>
        {saving
          ? "Menyimpan..."
          : isEditing
            ? "Simpan Perubahan"
            : "Simpan Tugas"}
      </button>

      {isEditing && (
        <button
          onClick={handleDelete}
          disabled={saving || deleting}
          className="w-full mt-2.5 py-3 rounded-2xl font-bold text-[13px] disabled:opacity-50 transition-colors"
          style={{
            background: confirmDelete ? C.roseDeep : "#463F5C0f",
            color: confirmDelete ? "#FFFFFF" : C.roseDeep,
          }}>
          {deleting
            ? "Menghapus..."
            : confirmDelete
              ? "Yakin? Tap sekali lagi untuk hapus"
              : "🗑️ Hapus Tugas"}
        </button>
      )}
    </div>
  );
}
