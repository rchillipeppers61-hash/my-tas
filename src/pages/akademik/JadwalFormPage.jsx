import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import { C, FONT_IMPORT } from "../../lib/theme";
import { HARI_LIST, WARNA_MK } from "./constants";

// Sama kayak yang di JadwalPage.jsx: kalau jadwal yang dihapus itu
// jadwal terakhir buat mata kuliah tsb, mata kuliahnya ikut dibersihkan
// -- termasuk tugas & catatan yang masih nempel di situ. study_packs
// gak ikut, karena kolomnya nyimpen nama mata kuliah sebagai teks
// bebas (bukan FK ke mata_kuliah_id), jadi riwayat Study Pack lama
// tetap valid walau mata kuliahnya udah dihapus.
async function cleanupOrphanMataKuliah(mataKuliahId, userId) {
  const { count } = await supabase
    .from("jadwal")
    .select("id", { count: "exact", head: true })
    .eq("mata_kuliah_id", mataKuliahId)
    .eq("user_id", userId);

  if (count) return; // masih dipakai jadwal lain, biarin

  await supabase
    .from("tugas")
    .delete()
    .eq("mata_kuliah_id", mataKuliahId)
    .eq("user_id", userId);
  await supabase
    .from("catatan")
    .delete()
    .eq("mata_kuliah_id", mataKuliahId)
    .eq("user_id", userId);
  await supabase
    .from("mata_kuliah")
    .delete()
    .eq("id", mataKuliahId)
    .eq("user_id", userId);
}

const inputClass =
  "w-full mt-1.5 mb-3.5 px-3.5 py-3 rounded-2xl text-[15px] outline-none border-[1.5px] transition-shadow focus:ring-4 focus:ring-[#8B72C42A]";
const inputStyle = {
  background: "#463F5C08",
  color: C.ink,
  borderColor: "#463F5C1F",
};

// ============================================================
// JadwalFormPage — satu form buat nambah mata kuliah + jadwal
// jamnya sekaligus (mode "baru"), atau pilih mata kuliah yang
// udah ada terus tinggal isi jam/ruangan (mode "existing").
// Dipakai juga buat EDIT: JadwalPage kirim `state.jadwal` pas
// navigate ke sini.
// ============================================================
export default function JadwalFormPage({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const editing = location.state?.jadwal || null;
  const isEditing = Boolean(editing);
  const isParent = user.role === "orang_tua";
  const targetId = isParent ? user.linked_child_id : user.id;

  const [mataKuliahList, setMataKuliahList] = useState([]);
  const [loadingMk, setLoadingMk] = useState(true);
  const [mode, setMode] = useState(
    editing?.mata_kuliah_id ? "existing" : "baru",
  );
  // Edit selalu pakai field lengkap (nama, kode, dosen, SKS, warna)
  // langsung ke mata kuliah yang bersangkutan -- toggle existing/baru
  // cuma relevan pas bikin jadwal BARU, biar SKS dkk gak ilang pas edit.
  const showFullFields = isEditing || mode === "baru";

  // Mata kuliah existing
  const [selectedMkId, setSelectedMkId] = useState(
    editing?.mata_kuliah_id || "",
  );

  // Mata kuliah baru
  const [nama, setNama] = useState(editing?.mata_kuliah?.nama || "");
  const [kode, setKode] = useState(editing?.mata_kuliah?.kode || "");
  const [dosen, setDosen] = useState(editing?.mata_kuliah?.dosen || "");
  const [sks, setSks] = useState(
    editing?.mata_kuliah?.sks != null ? String(editing.mata_kuliah.sks) : "3",
  );
  const [warna, setWarna] = useState(
    editing?.mata_kuliah?.warna || WARNA_MK[0].value,
  );

  // Jadwal
  const [hari, setHari] = useState(editing?.hari || HARI_LIST[0]);
  const [jamMulai, setJamMulai] = useState(
    editing?.jam_mulai?.slice(0, 5) || "",
  );
  const [jamSelesai, setJamSelesai] = useState(
    editing?.jam_selesai?.slice(0, 5) || "",
  );
  const [ruangan, setRuangan] = useState(editing?.ruangan || "");

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    async function fetchMk() {
      setLoadingMk(true);
      const { data, error: fetchError } = await supabase
        .from("mata_kuliah")
        .select("id, nama, kode, dosen, sks, warna")
        .eq("user_id", targetId)
        .order("nama", { ascending: true });
      if (!fetchError) setMataKuliahList(data || []);
      setLoadingMk(false);
    }
    fetchMk();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave() {
    setError("");

    if (!jamMulai || !jamSelesai) {
      setError("Isi jam mulai dan jam selesai dulu ya.");
      return;
    }
    if (jamSelesai <= jamMulai) {
      setError("Jam selesai harus setelah jam mulai.");
      return;
    }
    if (!showFullFields && !selectedMkId) {
      setError("Pilih mata kuliahnya dulu.");
      return;
    }
    if (showFullFields && !nama.trim()) {
      setError("Isi nama mata kuliah dulu.");
      return;
    }

    setSaving(true);

    let mataKuliahId = showFullFields ? null : selectedMkId;

    // showFullFields -- insert / update record mata_kuliah dulu.
    // Edit SELALU lewat jalur ini (update mata_kuliah_id yang sudah
    // nempel di jadwal), bukan cuma pas mode "baru" pilihan create.
    if (showFullFields) {
      const mkPayload = {
        user_id: targetId,
        nama: nama.trim(),
        kode: kode.trim() || null,
        dosen: dosen.trim() || null,
        sks: sks ? parseInt(sks, 10) : null,
        warna,
      };

      if (isEditing && editing.mata_kuliah_id) {
        // Edit jadwal -- update langsung data mata kuliah yang nempel.
        const { error: mkError } = await supabase
          .from("mata_kuliah")
          .update(mkPayload)
          .eq("id", editing.mata_kuliah_id)
          .eq("user_id", targetId);
        if (mkError) {
          setSaving(false);
          setError("Gagal menyimpan data mata kuliah.");
          return;
        }
        mataKuliahId = editing.mata_kuliah_id;
      } else {
        const { data: newMk, error: mkError } = await supabase
          .from("mata_kuliah")
          .insert(mkPayload)
          .select("id")
          .single();
        if (mkError || !newMk) {
          setSaving(false);
          setError("Gagal menyimpan mata kuliah baru.");
          return;
        }
        mataKuliahId = newMk.id;
      }
    }

    const jadwalPayload = {
      user_id: targetId,
      mata_kuliah_id: mataKuliahId,
      hari,
      jam_mulai: jamMulai,
      jam_selesai: jamSelesai,
      ruangan: ruangan.trim() || null,
    };

    const { error: jadwalError } = isEditing
      ? await supabase
          .from("jadwal")
          .update(jadwalPayload)
          .eq("id", editing.id)
          .eq("user_id", targetId)
      : await supabase.from("jadwal").insert(jadwalPayload);

    setSaving(false);

    if (jadwalError) {
      setError("Gagal menyimpan jadwal, coba lagi.");
      return;
    }

    navigate("/akademik/jadwal");
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    const { error: deleteError } = await supabase
      .from("jadwal")
      .delete()
      .eq("id", editing.id)
      .eq("user_id", targetId);

    if (!deleteError && editing.mata_kuliah_id) {
      await cleanupOrphanMataKuliah(editing.mata_kuliah_id, targetId);
    }

    setDeleting(false);
    if (!deleteError) {
      navigate("/akademik/jadwal");
    } else {
      setError("Gagal menghapus jadwal, coba lagi.");
      setConfirmDelete(false);
    }
  }

  return (
    <div
      className="max-w-lg mx-auto px-4 sm:px-6 py-8 sm:py-10 pb-16"
      style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{FONT_IMPORT}</style>

      <button
        onClick={() => navigate("/akademik/jadwal")}
        className="text-[12.5px] font-semibold mb-4 -ml-1 px-1 py-2 flex items-center gap-1"
        style={{ color: C.lavender }}>
        ← Kembali
      </button>

      <h1
        style={{ fontFamily: "'Fraunces', serif", color: C.ink }}
        className="text-[22px] font-semibold mb-1">
        {isEditing ? "Edit Jadwal" : "Tambah Jadwal"}
      </h1>
      <p className="text-[12.5px] mb-6" style={{ color: C.inkFaint }}>
        Pilih mata kuliah yang udah ada, atau tambah baru sekalian sama jamnya.
      </p>

      {/* Toggle mode -- cuma muncul pas BIKIN jadwal baru. Pas edit,
          selalu pakai field lengkap langsung (lihat showFullFields),
          jadi gak ada pilihan lagi di sini. */}
      {!isEditing && (
        <div
          className="flex rounded-2xl p-1.5 mb-4 gap-1.5"
          style={{ background: "#463F5C0d" }}>
          {[
            { key: "existing", label: "Mata Kuliah Ada" },
            { key: "baru", label: "Mata Kuliah Baru" },
          ].map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setMode(opt.key)}
              className="flex-1 py-3 rounded-xl text-[12px] sm:text-[12.5px] font-bold transition-all text-center leading-tight px-1"
              style={{
                background: mode === opt.key ? C.lavender : "transparent",
                color: mode === opt.key ? "#FFFFFF" : C.inkSoft,
              }}>
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {!showFullFields ? (
        <>
          <label
            className="text-[11px] uppercase tracking-wide font-bold"
            style={{ color: C.inkFaint }}>
            Mata Kuliah
          </label>
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
                  {mk.kode ? `[${mk.kode}] ` : ""}
                  {mk.nama} {mk.dosen ? `— ${mk.dosen}` : ""}
                </option>
              ))}
            </select>
            <span
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 -mt-1.5 text-[12px]"
              style={{ color: C.inkFaint }}>
              ▾
            </span>
          </div>
          {!loadingMk && mataKuliahList.length === 0 && (
            <p
              className="text-[11.5px] -mt-2.5 mb-3.5"
              style={{ color: C.inkFaint }}>
              Belum ada mata kuliah tersimpan. Coba pilih "Mata Kuliah Baru".
            </p>
          )}
        </>
      ) : (
        <>
          <label
            className="text-[11px] uppercase tracking-wide font-bold"
            style={{ color: C.inkFaint }}>
            Nama Mata Kuliah
          </label>
          <input
            type="text"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            placeholder="Kalkulus I"
            className={inputClass}
            style={inputStyle}
          />

          <label
            className="text-[11px] uppercase tracking-wide font-bold"
            style={{ color: C.inkFaint }}>
            Kode Mata Kuliah (opsional)
          </label>
          <input
            type="text"
            value={kode}
            onChange={(e) => setKode(e.target.value)}
            placeholder="Contoh: MAT101"
            className={inputClass}
            style={inputStyle}
          />

          <label
            className="text-[11px] uppercase tracking-wide font-bold"
            style={{ color: C.inkFaint }}>
            Dosen (opsional)
          </label>
          <input
            type="text"
            value={dosen}
            onChange={(e) => setDosen(e.target.value)}
            placeholder="Nama dosen"
            className={inputClass}
            style={inputStyle}
          />

          <label
            className="text-[11px] uppercase tracking-wide font-bold"
            style={{ color: C.inkFaint }}>
            SKS
          </label>
          <input
            type="number"
            value={sks}
            onChange={(e) => setSks(e.target.value)}
            min="1"
            max="6"
            className={`${inputClass} max-w-[110px]`}
            style={inputStyle}
          />

          <label
            className="text-[11px] uppercase tracking-wide font-bold"
            style={{ color: C.inkFaint }}>
            Warna
          </label>
          <div className="flex items-center flex-wrap gap-0.5 -mx-1 mt-1.5 mb-3.5">
            {WARNA_MK.map((w) => (
              <button
                key={w.value}
                type="button"
                onClick={() => setWarna(w.value)}
                aria-label={w.label}
                className="w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center">
                <span
                  className="w-7 h-7 rounded-full block transition-transform"
                  style={{
                    background: w.value,
                    transform: warna === w.value ? "scale(1.15)" : "scale(1)",
                    boxShadow:
                      warna === w.value
                        ? `0 0 0 2px #FFFFFF, 0 0 0 4px ${w.value}`
                        : "none",
                  }}
                />
              </button>
            ))}
          </div>
        </>
      )}

      <label
        className="text-[11px] uppercase tracking-wide font-bold"
        style={{ color: C.inkFaint }}>
        Hari
      </label>
      <div className="relative">
        <select
          value={hari}
          onChange={(e) => setHari(e.target.value)}
          className={`${inputClass} appearance-none pr-9`}
          style={inputStyle}>
          {HARI_LIST.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <span
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 -mt-1.5 text-[12px]"
          style={{ color: C.inkFaint }}>
          ▾
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            className="text-[11px] uppercase tracking-wide font-bold"
            style={{ color: C.inkFaint }}>
            Jam Mulai
          </label>
          <input
            type="time"
            value={jamMulai}
            onChange={(e) => setJamMulai(e.target.value)}
            className={inputClass}
            style={inputStyle}
          />
        </div>
        <div>
          <label
            className="text-[11px] uppercase tracking-wide font-bold"
            style={{ color: C.inkFaint }}>
            Jam Selesai
          </label>
          <input
            type="time"
            value={jamSelesai}
            onChange={(e) => setJamSelesai(e.target.value)}
            className={inputClass}
            style={inputStyle}
          />
        </div>
      </div>

      <label
        className="text-[11px] uppercase tracking-wide font-bold"
        style={{ color: C.inkFaint }}>
        Ruangan (opsional)
      </label>
      <input
        type="text"
        value={ruangan}
        onChange={(e) => setRuangan(e.target.value)}
        placeholder="Contoh: FMIPA 301"
        className={`${inputClass} mb-2`}
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
          background: `linear-gradient(135deg, ${C.lavender}, ${C.skyDeep})`,
          color: "#FFFFFF",
          boxShadow: "0 14px 28px -14px rgba(139,114,196,0.6)",
        }}>
        {saving
          ? "Menyimpan..."
          : isEditing
            ? "Simpan Perubahan"
            : "Simpan Jadwal"}
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
              : "🗑️ Hapus Jadwal"}
        </button>
      )}
    </div>
  );
}
