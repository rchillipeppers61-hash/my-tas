import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import { C, FONT_IMPORT } from "../../lib/theme";
import { Card } from "../../components/ui";
import {
  STATUS_TUGAS,
  statusMeta,
  nextStatus,
  prioritasMeta,
  deadlineLabel,
  formatDeadline,
  daysUntil,
  URGENT_DAYS_LIMIT,
} from "./constants";

// ============================================================
// TugasPage — daftar tugas & deadline, bisa difilter per status,
// diurutkan berdasar deadline terdekat. Tap badge status buat
// siklus belum -> proses -> selesai tanpa buka form.
// ============================================================
export default function TugasPage({ user }) {
  const navigate = useNavigate();
  const isParent = user.role === "orang_tua";
  const targetId = isParent ? user.linked_child_id : user.id;
  const targetLinked = isParent ? Boolean(user.linked_child_id) : true;

  const [tugas, setTugas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("semua");
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  async function fetchTugas() {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("tugas")
      .select("*, mata_kuliah(id, nama, warna)")
      .eq("user_id", targetId)
      .order("deadline", { ascending: true });
    if (fetchError) {
      setError("Gagal memuat tugas. Cek koneksi kamu, terus coba lagi.");
    } else {
      setTugas(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (targetLinked) {
      fetchTugas();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleToggleStatus(item) {
    setUpdatingId(item.id);
    const newStatus = nextStatus(item.status);
    const { error } = await supabase
      .from("tugas")
      .update({ status: newStatus })
      .eq("id", item.id)
      .eq("user_id", targetId);
    setUpdatingId(null);
    if (!error) {
      setTugas((prev) =>
        prev.map((t) => (t.id === item.id ? { ...t, status: newStatus } : t)),
      );
    }
  }

  async function handleDelete(id) {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    setDeletingId(id);
    const { error } = await supabase
      .from("tugas")
      .delete()
      .eq("id", id)
      .eq("user_id", targetId);
    setDeletingId(null);
    setConfirmDeleteId(null);
    if (!error) await fetchTugas();
  }

  const filtered = useMemo(() => {
    if (filter === "semua") return tugas;
    return tugas.filter((t) => t.status === filter);
  }, [tugas, filter]);

  // Nama mata kuliah manual (kalau mata_kuliah_id null) disimpen di
  // baris pertama catatan dengan format "Mata kuliah: X". Ini di-parse
  // balik di sini biar tetep kebaca sebagai badge, bukan teks catatan.
  function courseLabel(item) {
    if (item.mata_kuliah?.nama) return item.mata_kuliah.nama;
    const match = item.catatan?.match(/^Mata kuliah: (.+)$/m);
    return match ? match[1] : null;
  }

  function courseColor(item) {
    return item.mata_kuliah?.warna || C.inkFaint;
  }

  if (!targetLinked) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <style>{FONT_IMPORT}</style>
        <p
          className="text-[11px] tracking-[0.2em] uppercase font-semibold mb-1"
          style={{ color: C.roseDeep }}>
          Akademik
        </p>
        <h1
          style={{ fontFamily: "'Fraunces', serif", color: C.ink }}
          className="text-[22px] sm:text-[24px] font-semibold mb-4">
          Tugas & Deadline
        </h1>
        <Card>
          <p style={{ color: C.ink }}>
            Akun ini belum terhubung ke akun anak. Hubungi admin untuk mengatur{" "}
            <code>linked_child_id</code>.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="max-w-2xl lg:max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 pb-28 lg:pb-10"
      style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{FONT_IMPORT}</style>

      <div className="flex items-center justify-between mb-4">
        <div>
          <p
            className="text-[11px] tracking-[0.2em] uppercase font-semibold mb-1"
            style={{ color: C.roseDeep }}>
            Akademik
          </p>
          <h1
            style={{ fontFamily: "'Fraunces', serif", color: C.ink }}
            className="text-[22px] sm:text-[24px] font-semibold">
            {isParent ? "Tugas & Deadline Anak" : "Tugas & Deadline"}
          </h1>
        </div>
        <button
          onClick={() => navigate("/akademik/tugas/tambah")}
          className="hidden sm:flex items-center gap-1.5 px-4 py-2.5 rounded-2xl font-semibold text-[13px]"
          style={{
            background: `linear-gradient(135deg, ${C.roseDeep}, ${C.rose})`,
            color: "#FFFFFF",
          }}>
          + Tambah
        </button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-5">
        <FilterChip
          active={filter === "semua"}
          onClick={() => setFilter("semua")}
          label="Semua"
        />
        {STATUS_TUGAS.map((s) => (
          <FilterChip
            key={s.value}
            active={filter === s.value}
            onClick={() => setFilter(s.value)}
            label={`${s.icon} ${s.label}`}
          />
        ))}
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
            onClick={fetchTugas}
            className="flex-shrink-0 min-h-[40px] px-3.5 rounded-full text-[12px] font-semibold"
            style={{ color: C.roseDeep, background: "#FFFFFF" }}>
            Coba lagi
          </button>
        </div>
      )}

      {loading ? (
        <div
          className="space-y-2.5 lg:grid lg:grid-cols-2 lg:gap-2.5 lg:space-y-0"
          aria-live="polite"
          aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[74px] rounded-3xl animate-pulse"
              style={{ background: "#463F5C0F" }}
            />
          ))}
          <span className="sr-only">Memuat tugas...</span>
        </div>
      ) : filtered.length === 0 ? (
        <Card className="text-center py-10">
          <div
            className="w-14 h-14 mx-auto rounded-full flex items-center justify-center text-[26px] mb-3"
            style={{ background: "#F4A6B71F" }}>
            📌
          </div>
          <p
            className="text-[13.5px] font-medium mb-1"
            style={{ color: C.ink }}>
            {filter === "semua" ? "Belum ada tugas" : "Gak ada tugas di sini"}
          </p>
          <p className="text-[12px]" style={{ color: C.inkFaint }}>
            {filter === "semua"
              ? isParent
                ? "Belum ada tugas anak. Yuk catat biar gak kelewat."
                : "Catat tugas kuliah biar gak ada yang kelewat."
              : "Coba pilih filter lain."}
          </p>
        </Card>
      ) : (
        <div className="space-y-2.5 lg:grid lg:grid-cols-2 lg:gap-2.5 lg:space-y-0">
          {filtered.map((item) => {
            const meta = statusMeta(item.status);
            const prio = prioritasMeta(item.prioritas);
            const diff = daysUntil(item.deadline);
            const isUrgent =
              item.status !== "selesai" && diff <= URGENT_DAYS_LIMIT;
            const isConfirming = confirmDeleteId === item.id;
            const course = courseLabel(item);

            return (
              <Card
                key={item.id}
                className="!p-4"
                accent={course ? courseColor(item) : null}>
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => handleToggleStatus(item)}
                    disabled={updatingId === item.id}
                    aria-label="Ubah status"
                    className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-[16px] transition-opacity disabled:opacity-50"
                    style={{ background: meta.bg }}>
                    {meta.icon}
                  </button>

                  <button
                    onClick={() =>
                      navigate("/akademik/tugas/tambah", {
                        state: { tugas: item },
                      })
                    }
                    className="flex-1 min-w-0 text-left">
                    <p
                      className="text-[14px] font-semibold leading-snug"
                      style={{
                        color: item.status === "selesai" ? C.inkFaint : C.ink,
                        textDecoration:
                          item.status === "selesai" ? "line-through" : "none",
                      }}>
                      {item.judul}
                    </p>
                    <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                      {course && (
                        <span
                          className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            background: `${courseColor(item)}1A`,
                            color: courseColor(item),
                          }}>
                          {course}
                        </span>
                      )}
                      <span
                        className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: prio.bg, color: prio.color }}>
                        {prio.label}
                      </span>
                      <span
                        className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          background: isUrgent ? "#F4A6B71F" : "#463F5C0f",
                          color: isUrgent ? C.roseDeep : C.inkFaint,
                        }}>
                        {isUrgent ? "⏰ " : ""}
                        {deadlineLabel(item.deadline)} ·{" "}
                        {formatDeadline(item.deadline)}
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                    className="flex-shrink-0 min-w-[44px] min-h-[44px] text-[11px] font-semibold px-3 rounded-full disabled:opacity-50 flex items-center justify-center"
                    style={{
                      background: isConfirming ? C.roseDeep : "#463F5C0f",
                      color: isConfirming ? "#FFFFFF" : C.inkFaint,
                    }}>
                    {deletingId === item.id
                      ? "..."
                      : isConfirming
                        ? "Yakin?"
                        : "🗑️"}
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <button
        onClick={() => navigate("/akademik/tugas/tambah")}
        className="fixed right-5 sm:right-8 sm:hidden w-14 h-14 rounded-full flex items-center justify-center text-[26px] font-light"
        style={{
          bottom: "calc(4.5rem + env(safe-area-inset-bottom, 0px) + 0.75rem)",
          background: `linear-gradient(135deg, ${C.roseDeep}, ${C.rose})`,
          color: "#FFFFFF",
          boxShadow: "0 14px 30px -10px rgba(217,96,122,0.6)",
        }}>
        +
      </button>
    </div>
  );
}

function FilterChip({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 px-3.5 py-2.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition-colors"
      style={{
        background: active ? C.roseDeep : "#463F5C0d",
        color: active ? "#FFFFFF" : C.inkSoft,
      }}>
      {label}
    </button>
  );
}
