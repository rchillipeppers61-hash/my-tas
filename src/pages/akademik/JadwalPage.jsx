import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import { C, FONT_IMPORT } from "../../lib/theme";
import { Card } from "../../components/ui";
import { HARI_LIST, hariIndex } from "./constants";

// Dipanggil tiap kali 1 jadwal dihapus. Kalau itu jadwal terakhir yang
// masih nempel ke mata kuliah tsb, mata kuliahnya dianggap "yatim" dan
// ikut dibersihkan -- termasuk tugas & catatan yang masih nempel di situ,
// biar gak nyangkut data orphan di Catatan/Tugas.
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

// ============================================================
// JadwalPage — daftar jadwal kuliah dikelompokkan per hari
// (Senin -> Minggu). Tap kartu buat edit, FAB buat tambah baru.
// ============================================================
export default function JadwalPage({ user }) {
  const navigate = useNavigate();
  const [jadwal, setJadwal] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  async function fetchJadwal() {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("jadwal")
      .select("*, mata_kuliah(id, nama, kode, dosen, sks, warna)")
      .eq("user_id", user.id)
      .order("jam_mulai", { ascending: true });
    if (fetchError) {
      setError("Gagal memuat jadwal. Cek koneksi kamu, terus coba lagi.");
    } else {
      setJadwal(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchJadwal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(id) {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    setDeletingId(id);

    const target = jadwal.find((j) => j.id === id);
    const mataKuliahId = target?.mata_kuliah_id;

    const { error } = await supabase
      .from("jadwal")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (!error && mataKuliahId) {
      await cleanupOrphanMataKuliah(mataKuliahId, user.id);
    }

    setDeletingId(null);
    setConfirmDeleteId(null);
    if (!error) await fetchJadwal();
  }

  const grouped = useMemo(() => {
    const map = {};
    jadwal.forEach((j) => {
      (map[j.hari] = map[j.hari] || []).push(j);
    });
    return Object.entries(map).sort(
      (a, b) => hariIndex(a[0]) - hariIndex(b[0]),
    );
  }, [jadwal]);

  return (
    <div
      className="max-w-2xl lg:max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 pb-28 lg:pb-10"
      style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{FONT_IMPORT}</style>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            style={{ fontFamily: "'Fraunces', serif", color: C.ink }}
            className="text-[22px] sm:text-[24px] font-semibold">
            Jadwal Kuliah
          </h1>
        </div>
        <button
          onClick={() => navigate("/akademik/jadwal/tambah")}
          className="hidden sm:flex items-center gap-1.5 px-4 py-2.5 rounded-2xl font-semibold text-[13px]"
          style={{
            background: `linear-gradient(135deg, ${C.lavender}, ${C.skyDeep})`,
            color: "#FFFFFF",
          }}>
          + Tambah
        </button>
      </div>

      {!loading && error && (
        <div
          className="flex items-center gap-2.5 rounded-2xl px-4 py-3 mb-4"
          style={{ background: "#D9607A1F", border: "1.5px solid #D9607A55" }}>
          <span className="text-[18px] flex-shrink-0">⚠️</span>
          <p
            className="text-[12.5px] sm:text-[13px] font-semibold flex-1 min-w-0"
            style={{ color: C.roseDeep }}>
            {error}
          </p>
          <button
            onClick={fetchJadwal}
            className="flex-shrink-0 min-h-[40px] px-3.5 rounded-full text-[12px] font-semibold"
            style={{ color: C.roseDeep, background: "#FFFFFF" }}>
            Coba lagi
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-5" aria-live="polite" aria-busy="true">
          {[0, 1].map((i) => (
            <div key={i}>
              <div
                className="h-6 w-20 rounded-full animate-pulse mb-2.5"
                style={{ background: "#463F5C14" }}
              />
              <div className="space-y-2.5 lg:grid lg:grid-cols-2 lg:gap-2.5 lg:space-y-0">
                <div
                  className="h-[64px] rounded-3xl animate-pulse"
                  style={{ background: "#463F5C0F" }}
                />
                <div
                  className="h-[64px] rounded-3xl animate-pulse"
                  style={{ background: "#463F5C0F" }}
                />
              </div>
            </div>
          ))}
          <span className="sr-only">Memuat jadwal...</span>
        </div>
      ) : grouped.length === 0 ? (
        <Card className="text-center py-10">
          <div
            className="w-14 h-14 mx-auto rounded-full flex items-center justify-center text-[26px] mb-3"
            style={{ background: "#8B72C41A" }}>
            🗓️
          </div>
          <p
            className="text-[13.5px] font-medium mb-1"
            style={{ color: C.ink }}>
            Belum ada jadwal
          </p>
          <p className="text-[12px]" style={{ color: C.inkFaint }}>
            Tambahin jadwal kuliah kamu biar gampang dicek.
          </p>
        </Card>
      ) : (
        <div className="space-y-5">
          {grouped.map(([hari, items]) => (
            <div key={hari}>
              <span
                className="inline-flex items-center px-3 py-1 rounded-full text-[11px] sm:text-[12px] font-bold mb-2.5"
                style={{ background: "#8B72C41A", color: C.lavender }}>
                {hari}
              </span>
              <div className="space-y-2.5 lg:grid lg:grid-cols-2 lg:gap-2.5 lg:space-y-0">
                {items.map((j) => {
                  const mk = j.mata_kuliah || {};
                  const isConfirming = confirmDeleteId === j.id;
                  return (
                    <Card key={j.id} className="!p-4" border accent={mk.warna}>
                      <div className="flex items-start justify-between gap-3">
                        <button
                          onClick={() =>
                            navigate("/akademik/jadwal/tambah", {
                              state: { jadwal: j },
                            })
                          }
                          className="text-left flex-1 min-w-0">
                          <p
                            className="text-[14.5px] font-semibold truncate"
                            style={{ color: C.ink }}>
                            {mk.nama || "Tanpa nama"}
                          </p>
                          {mk.kode && (
                            <p
                              className="text-[11px] font-semibold mt-0.5"
                              style={{ color: C.lavender }}>
                              {mk.kode}
                            </p>
                          )}
                          <p
                            className="text-[12px] mt-0.5"
                            style={{ color: C.inkFaint }}>
                            {mk.dosen ? `${mk.dosen} · ` : ""}
                            {j.jam_mulai?.slice(0, 5)}–
                            {j.jam_selesai?.slice(0, 5)}
                            {j.ruangan ? ` · ${j.ruangan}` : ""}
                          </p>
                        </button>
                        <button
                          onClick={() => handleDelete(j.id)}
                          disabled={deletingId === j.id}
                          aria-label="Hapus jadwal"
                          className="flex-shrink-0 min-w-[44px] min-h-[44px] text-[11px] font-semibold px-3 rounded-full disabled:opacity-50 flex items-center justify-center"
                          style={{
                            background: isConfirming ? C.roseDeep : "#D9607A17",
                            color: isConfirming ? "#FFFFFF" : C.roseDeep,
                          }}>
                          {deletingId === j.id ? (
                            "..."
                          ) : isConfirming ? (
                            "Yakin?"
                          ) : (
                            <TrashIcon />
                          )}
                        </button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => navigate("/akademik/jadwal/tambah")}
        className="fixed right-5 sm:right-8 sm:hidden w-14 h-14 rounded-full flex items-center justify-center text-[26px] font-light"
        style={{
          bottom: "calc(4.5rem + env(safe-area-inset-bottom, 0px) + 0.75rem)",
          background: `linear-gradient(135deg, ${C.lavender}, ${C.skyDeep})`,
          color: "#FFFFFF",
          boxShadow: "0 14px 30px -10px rgba(139,114,196,0.6)",
        }}>
        +
      </button>
    </div>
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
