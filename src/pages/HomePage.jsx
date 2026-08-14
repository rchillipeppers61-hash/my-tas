import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { C, FONT_IMPORT } from "../lib/theme";
import { capitalize, rupiah } from "../lib/format";
import { Card } from "../components/ui";
import { LOW_BALANCE_LIMIT } from "./wallet/constants";
import {
  HARI_LIST,
  statusMeta,
  nextStatus,
  prioritasMeta,
  deadlineLabel,
  formatDeadline,
  daysUntil,
  URGENT_DAYS_LIMIT,
} from "./akademik/constants";

// Hari ini dalam format HARI_LIST ("Senin".."Minggu"). getDay() JS
// mulai dari Minggu=0, jadi digeser +6 mod 7 biar Senin=0.
function todayHari() {
  return HARI_LIST[(new Date().getDay() + 6) % 7];
}

export default function HomePage({ user }) {
  const name = capitalize(user?.username) || "Kamu";
  const isParent = user?.role === "orang_tua";

  // Akademik (jadwal/tugas) & Wallet dua-duanya diarahin ke data ANAK
  // kalau yang login orang tua -- sama kayak pola ParentDashboard.
  // Kalau anak yang login, targetId = dirinya sendiri.
  const targetId = isParent ? user.linked_child_id : user.id;
  const targetLinked = isParent ? Boolean(user.linked_child_id) : true;

  const [loading, setLoading] = useState(true);

  // Wallet
  const [saldo, setSaldo] = useState(0);
  const [childName, setChildName] = useState("");

  // Jadwal
  const [jadwalHariIni, setJadwalHariIni] = useState([]);

  // Tugas
  const [tugasList, setTugasList] = useState([]);
  const [updatingTugasId, setUpdatingTugasId] = useState(null);

  useEffect(() => {
    if (targetLinked) {
      loadAll();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAll() {
    setLoading(true);
    await Promise.all([
      loadChildName(),
      loadWallet(),
      loadJadwal(),
      loadTugas(),
    ]);
    setLoading(false);
  }

  async function loadChildName() {
    if (!isParent) return;
    const { data } = await supabase
      .from("users")
      .select("nama_lengkap, username")
      .eq("id", targetId)
      .single();
    if (data) setChildName(data.nama_lengkap || data.username);
  }

  async function loadWallet() {
    const { data, error } = await supabase
      .from("transactions")
      .select("type, amount")
      .eq("owner_id", targetId)
      .is("deleted_at", null);

    if (!error && data) {
      const totalIn = data
        .filter((t) => t.type === "in")
        .reduce((s, t) => s + Number(t.amount), 0);
      const totalOut = data
        .filter((t) => t.type === "out")
        .reduce((s, t) => s + Number(t.amount), 0);
      setSaldo(totalIn - totalOut);
    }
  }

  async function loadJadwal() {
    const { data, error } = await supabase
      .from("jadwal")
      .select("*, mata_kuliah(nama, dosen, warna)")
      .eq("user_id", targetId)
      .eq("hari", todayHari())
      .order("jam_mulai", { ascending: true });
    if (!error) setJadwalHariIni(data || []);
  }

  async function loadTugas() {
    const { data, error } = await supabase
      .from("tugas")
      .select("*, mata_kuliah(nama, warna)")
      .eq("user_id", targetId)
      .neq("status", "selesai")
      .order("deadline", { ascending: true });
    if (!error) setTugasList(data || []);
  }

  async function handleToggleStatus(item) {
    // Orang tua cuma liat, bukan yang ngerjain -- toggle status dari
    // Home cuma aktif buat anak (ngerjain tugasnya sendiri).
    if (isParent) return;

    setUpdatingTugasId(item.id);
    const newStatus = nextStatus(item.status);
    const { error } = await supabase
      .from("tugas")
      .update({ status: newStatus })
      .eq("id", item.id)
      .eq("user_id", targetId);
    setUpdatingTugasId(null);
    if (!error) {
      if (newStatus === "selesai") {
        setTugasList((prev) => prev.filter((t) => t.id !== item.id));
      } else {
        setTugasList((prev) =>
          prev.map((t) => (t.id === item.id ? { ...t, status: newStatus } : t)),
        );
      }
    }
  }

  const tugasUrgent = useMemo(
    () => tugasList.filter((t) => daysUntil(t.deadline) <= URGENT_DAYS_LIMIT),
    [tugasList],
  );

  // Reminder terpenting -- murni dari tugas, maksimal 2 baris.
  // Buat orang tua, teksnya disesuaikan biar jelas ini soal anaknya
  // (dan jadi bahan buat WA manual kalau perlu).
  const reminders = useMemo(() => {
    const list = [];
    const overdue = tugasUrgent.filter((t) => daysUntil(t.deadline) < 0);
    const upcoming = tugasUrgent
      .filter((t) => daysUntil(t.deadline) >= 0)
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

    const subject = isParent ? `${capitalize(childName) || "Anak"}` : "Kamu";

    if (overdue.length > 0) {
      list.push({
        icon: "⚠️",
        text:
          overdue.length === 1
            ? `Tugas "${overdue[0].judul}" ${isParent ? `punya ${subject} ` : ""}udah lewat deadline!`
            : `${subject} punya ${overdue.length} tugas yang udah lewat deadline.`,
      });
    }

    if (upcoming.length > 0 && list.length < 2) {
      const t = upcoming[0];
      list.push({
        icon: "⏰",
        text: `Tugas "${t.judul}" ${isParent ? `${subject} ` : ""}deadline ${deadlineLabel(t.deadline).toLowerCase()}.`,
      });
    }

    return list.slice(0, 2);
  }, [tugasUrgent, isParent, childName]);

  const isLowBalance = saldo < LOW_BALANCE_LIMIT;

  if (!targetLinked) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <style>{FONT_IMPORT}</style>
        <p
          className="text-[11px] tracking-[0.2em] uppercase font-semibold mb-1"
          style={{ color: C.lavender }}>
          Beranda
        </p>
        <h1
          style={{ fontFamily: "'Fraunces', serif", color: C.ink }}
          className="text-[24px] font-semibold mb-4">
          Halo, {name} 👋
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
      className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10 pb-20 lg:pb-10"
      style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{FONT_IMPORT}</style>

      <p
        className="text-[11px] tracking-[0.2em] uppercase font-semibold mb-1"
        style={{ color: C.lavender }}>
        Beranda
      </p>
      <h1
        style={{ fontFamily: "'Fraunces', serif", color: C.ink }}
        className="text-[24px] font-semibold mb-6 sm:mb-8">
        Halo, {name} 👋
      </h1>

      {loading ? (
        <p
          className="text-[13px] text-center py-10"
          style={{ color: C.inkFaint }}>
          Memuat...
        </p>
      ) : (
        <div className="space-y-4">
          {/* Reminder terpenting -- muncul cuma kalau ada tugas urgent/overdue. */}
          {reminders.map((r, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 rounded-2xl px-4 py-3"
              style={{
                background: "#F4A6B71F",
                border: "1.5px solid #F4A6B755",
              }}>
              <span className="text-[18px] flex-shrink-0">{r.icon}</span>
              <p
                className="text-[12.5px] sm:text-[13px] font-semibold"
                style={{ color: C.roseDeep }}>
                {r.text}
              </p>
            </div>
          ))}

          {/* Card Wallet */}
          <Link to="/wallet" className="block">
            <div
              className="rounded-[28px] p-5 sm:p-6 relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${C.lavender}, ${C.skyDeep})`,
                boxShadow: "0 20px 40px -18px rgba(70,63,92,0.5)",
              }}>
              <div
                className="absolute -top-8 -right-8 w-32 h-32 rounded-full"
                style={{ background: "rgba(255,255,255,0.12)" }}
              />
              <div className="relative z-10">
                <p
                  className="text-[10.5px] sm:text-[11px] uppercase tracking-[0.2em] font-semibold"
                  style={{ color: "rgba(255,255,255,0.75)" }}>
                  {isParent
                    ? `Saldo ${capitalize(childName) || "Anak"}`
                    : "Saldo Kamu"}
                </p>
                <p
                  style={{ fontFamily: "'Fraunces', serif", color: "#FFFFFF" }}
                  className="mt-1 text-[28px] sm:text-[32px] font-semibold leading-none">
                  {rupiah(saldo)}
                </p>
                <span
                  className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full text-[11px] font-semibold"
                  style={{
                    background: "rgba(255,255,255,0.18)",
                    color: "#FFFFFF",
                    border: "1px solid rgba(255,255,255,0.3)",
                  }}>
                  {isLowBalance
                    ? "⚠️ Saldo mulai menipis"
                    : "🌱 Saldo dalam kondisi aman"}
                </span>
              </div>
            </div>
          </Link>

          {/* Card Jadwal Hari Ini */}
          <Card
            title={
              isParent
                ? `Jadwal ${capitalize(childName) || "Anak"} Hari Ini`
                : "Jadwal Hari Ini"
            }
            sub={todayHari()}
            accent={C.lavender}>
            {jadwalHariIni.length === 0 ? (
              <p className="text-[12.5px]" style={{ color: C.inkFaint }}>
                {isParent
                  ? "Gak ada jadwal kuliah hari ini."
                  : "Gak ada jadwal hari ini, healing dulu! 😌"}
              </p>
            ) : (
              <div className="space-y-2.5">
                {jadwalHariIni.map((j) => {
                  const mk = j.mata_kuliah || {};
                  return (
                    <div
                      key={j.id}
                      className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl"
                      style={{ background: "#463F5C08" }}>
                      <div
                        className="w-1.5 h-9 rounded-full flex-shrink-0"
                        style={{ background: mk.warna || C.lavender }}
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-[13.5px] font-semibold truncate"
                          style={{ color: C.ink }}>
                          {mk.nama || "Tanpa nama"}
                        </p>
                        <p
                          className="text-[11.5px]"
                          style={{ color: C.inkFaint }}>
                          {j.jam_mulai?.slice(0, 5)}–
                          {j.jam_selesai?.slice(0, 5)}
                          {j.ruangan ? ` · ${j.ruangan}` : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {!isParent && (
              <Link
                to="/akademik/jadwal"
                className="inline-block mt-3.5 text-[12px] font-semibold"
                style={{ color: C.lavender }}>
                Lihat semua jadwal →
              </Link>
            )}
          </Card>

          {/* Card Tugas Mendekati Deadline */}
          <Card
            title={
              isParent
                ? `Tugas ${capitalize(childName) || "Anak"} Mendekati Deadline`
                : "Tugas Mendekati Deadline"
            }
            sub={`${URGENT_DAYS_LIMIT} hari ke depan`}
            accent={C.roseDeep}>
            {tugasUrgent.length === 0 ? (
              <p className="text-[12.5px]" style={{ color: C.inkFaint }}>
                Gak ada tugas yang mendesak. Aman! ✅
              </p>
            ) : (
              <div className="space-y-2">
                {tugasUrgent.map((item) => {
                  const meta = statusMeta(item.status);
                  const prio = prioritasMeta(item.prioritas);
                  const overdue = daysUntil(item.deadline) < 0;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl"
                      style={{
                        background: overdue ? "#F4A6B71A" : "#463F5C08",
                      }}>
                      <button
                        onClick={() => handleToggleStatus(item)}
                        disabled={updatingTugasId === item.id || isParent}
                        aria-label="Ubah status"
                        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[14px] disabled:opacity-50"
                        style={{
                          background: meta.bg,
                          cursor: isParent ? "default" : "pointer",
                        }}>
                        {meta.icon}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-[13.5px] font-semibold truncate"
                          style={{ color: C.ink }}>
                          {item.judul}
                        </p>
                        <div className="flex items-center flex-wrap gap-1.5 mt-1">
                          <span
                            className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: prio.bg, color: prio.color }}>
                            {prio.label}
                          </span>
                          <span
                            className="text-[10.5px] font-semibold"
                            style={{
                              color: overdue ? C.roseDeep : C.inkFaint,
                            }}>
                            {deadlineLabel(item.deadline)} ·{" "}
                            {formatDeadline(item.deadline)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {!isParent && (
              <Link
                to="/akademik/tugas"
                className="inline-block mt-3.5 text-[12px] font-semibold"
                style={{ color: C.roseDeep }}>
                Lihat semua tugas →
              </Link>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
