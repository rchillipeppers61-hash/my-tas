import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { C, FONT_IMPORT } from "./theme";
import Card from "./Card";
import TransactionForm from "./TransactionForm";
import ChangePasswordModal from "./ChangePasswordModal";
import {
  rupiah,
  todayISO,
  formatDay,
  daysBetween,
  categoryLabel,
  capitalize,
  monthLabel,
  LOW_BALANCE_LIMIT,
} from "../lib/shared";

const CATEGORY_META = {
  makan: { icon: "🍜", bg: "#8FD8BE2A" },
  jajan: { icon: "🍿", bg: "#F4A6B72A" },
  transport: { icon: "🚌", bg: "#9FCBF02A" },
  kuliah: { icon: "📚", bg: "#8B72C42A" },
  pribadi: { icon: "🧴", bg: "#F6C4532A" },
  lainnya: { icon: "✨", bg: "#463F5C14" },
};

function getCategoryMeta(cat) {
  return CATEGORY_META[cat] || CATEGORY_META.lainnya;
}

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export default function ChildDashboard({ user, onLogout }) {
  const [transactions, setTransactions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("week");

  const displayName = user.nama_lengkap || capitalize(user.username) || "Kamu";

  async function fetchTransactions() {
    setLoading(true);
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("owner_id", user.id)
      .order("date", { ascending: true });
    if (!error) setTransactions(data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addTransaction({ type, amount, note, category }) {
    const { error } = await supabase.from("transactions").insert({
      owner_id: user.id,
      type,
      amount,
      note,
      category: category || "lainnya",
      date: todayISO(),
    });
    if (!error) {
      await fetchTransactions();
      return true;
    }
    return false;
  }

  const totalIn = transactions
    .filter((t) => t.type === "in")
    .reduce((s, t) => s + t.amount, 0);
  const totalOut = transactions
    .filter((t) => t.type === "out")
    .reduce((s, t) => s + t.amount, 0);
  const saldo = totalIn - totalOut;
  const isLow = saldo < LOW_BALANCE_LIMIT;
  const currentMonthKey = todayISO().slice(0, 7);
  const totalOutThisMonth = transactions
    .filter((t) => t.type === "out" && t.date.slice(0, 7) === currentMonthKey)
    .reduce((s, t) => s + t.amount, 0);
  const avgOutPerDay = Math.round(
    totalOutThisMonth / daysBetween(`${currentMonthKey}-01`, todayISO()),
  );

  const availableMonths = useMemo(() => {
    const set = new Set(transactions.map((t) => t.date.slice(0, 7)));
    return Array.from(set).sort((a, b) => (a < b ? 1 : -1));
  }, [transactions]);

  const displayTransactions = useMemo(() => {
    if (period === "week") {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 6);
      const cutoffISO = cutoff.toISOString().slice(0, 10);
      return transactions.filter((t) => t.date >= cutoffISO);
    }
    return transactions.filter((t) => t.date.slice(0, 7) === period);
  }, [transactions, period]);

  const byDay = useMemo(() => {
    const map = {};
    displayTransactions.forEach((t) => {
      (map[t.date] = map[t.date] || []).push(t);
    });
    return Object.entries(map).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [displayTransactions]);

  return (
    <div
      className="min-h-screen w-full"
      style={{
        background: C.bg,
        fontFamily: "'Inter', sans-serif",
        color: C.ink,
      }}>
      <style>{FONT_IMPORT}</style>
      <div className="fixed inset-0 pointer-events-none overflow-hidden hidden sm:block">
        <div
          className="absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-40 blur-3xl"
          style={{ background: C.mint }}
        />
        <div
          className="absolute top-1/3 -left-32 w-80 h-80 rounded-full opacity-30 blur-3xl"
          style={{ background: C.rose }}
        />
        <div
          className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full opacity-30 blur-3xl"
          style={{ background: C.sky }}
        />
      </div>

      <div className="relative max-w-md sm:max-w-xl lg:max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-28 lg:pb-16">
        <div className="flex items-center justify-between mb-5 sm:mb-8">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center font-semibold text-[14px] sm:text-[15px] flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${C.lavender}, ${C.skyDeep})`,
                color: "#FFFFFF",
                fontFamily: "'Fraunces', serif",
              }}>
              {getInitials(displayName)}
            </div>
            <div className="min-w-0">
              <p
                className="text-[11px] tracking-[0.2em] uppercase font-semibold"
                style={{ color: C.lavender }}>
                My Wallet
              </p>
              <h1
                style={{ fontFamily: "'Fraunces', serif" }}
                className="text-[19px] sm:text-[25px] font-semibold leading-tight truncate">
                Halo, {displayName} 👋
              </h1>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="text-[12px] font-semibold px-3.5 py-2 rounded-2xl flex-shrink-0"
            style={{ background: C.roseDeep, color: "#FFFFFF" }}>
            Keluar
          </button>
        </div>

        {loading ? (
          <p
            className="text-[13px] text-center py-10"
            style={{ color: C.inkFaint }}>
            Memuat...
          </p>
        ) : (
          <div className="lg:grid lg:grid-cols-[minmax(0,340px)_1fr] lg:gap-6 lg:items-start">
            <div className="lg:sticky lg:top-8 flex flex-col gap-4">
              <div
                className="rounded-[32px] p-6 sm:p-8 relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${C.lavender}, ${C.skyDeep})`,
                  boxShadow: "0 24px 48px -20px rgba(70,63,92,0.5)",
                }}>
                <div
                  className="absolute -top-10 -right-10 w-40 h-40 rounded-full"
                  style={{ background: "rgba(255,255,255,0.12)" }}
                />
                <div
                  className="absolute -bottom-14 -left-8 w-36 h-36 rounded-full"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                />
                <div className="relative z-10">
                  <p
                    className="text-[11px] sm:text-[12px] uppercase tracking-[0.2em] font-semibold"
                    style={{ color: "rgba(255,255,255,0.75)" }}>
                    Saldo Sekarang
                  </p>
                  <p
                    style={{
                      fontFamily: "'Fraunces', serif",
                      color: "#FFFFFF",
                    }}
                    className="mt-1 text-[34px] sm:text-[42px] lg:text-[40px] font-semibold leading-none">
                    {rupiah(saldo)}
                  </p>
                  <span
                    className="inline-flex items-center gap-1.5 mt-3 sm:mt-4 px-3 py-1.5 rounded-full text-[11px] sm:text-[12px] font-semibold"
                    style={{
                      background: "rgba(255,255,255,0.18)",
                      color: "#FFFFFF",
                      border: "1px solid rgba(255,255,255,0.3)",
                    }}>
                    {isLow
                      ? "⚠️ Saldo mulai menipis"
                      : "🌱 Saldo dalam kondisi aman"}
                  </span>
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3 mt-5 sm:mt-6">
                    <div
                      className="rounded-2xl p-3 sm:p-3.5"
                      style={{
                        background: "rgba(255,255,255,0.14)",
                        border: "1px solid rgba(255,255,255,0.22)",
                      }}>
                      <p
                        className="text-[9px] sm:text-[10px] uppercase tracking-wide font-semibold"
                        style={{ color: "rgba(255,255,255,0.75)" }}>
                        Masuk
                      </p>
                      <p
                        className="text-[15px] sm:text-[17px] font-bold mt-0.5"
                        style={{ color: "#FFFFFF" }}>
                        {rupiah(totalIn)}
                      </p>
                    </div>
                    <div
                      className="rounded-2xl p-3 sm:p-3.5"
                      style={{
                        background: "rgba(255,255,255,0.14)",
                        border: "1px solid rgba(255,255,255,0.22)",
                      }}>
                      <p
                        className="text-[9px] sm:text-[10px] uppercase tracking-wide font-semibold"
                        style={{ color: "rgba(255,255,255,0.75)" }}>
                        Keluar
                      </p>
                      <p
                        className="text-[15px] sm:text-[17px] font-bold mt-0.5"
                        style={{ color: "#FFFFFF" }}>
                        {rupiah(totalOut)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className="text-[11px] uppercase tracking-[0.1em] font-semibold"
                      style={{ color: C.inkFaint }}>
                      Rata-rata / Hari
                    </p>
                    <p
                      className="text-[19px] sm:text-[21px] font-semibold mt-0.5"
                      style={{
                        fontFamily: "'Fraunces', serif",
                        color: C.lavender,
                      }}>
                      {rupiah(avgOutPerDay)}
                    </p>
                    <p
                      className="text-[10.5px] mt-0.5"
                      style={{ color: C.inkFaint }}>
                      Bulan ini
                    </p>
                  </div>
                  <div
                    className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center text-[20px] flex-shrink-0"
                    style={{ background: "#8B72C41A" }}>
                    📊
                  </div>
                </div>
              </Card>

              <button
                onClick={() => setShowForm(true)}
                className="w-full py-3.5 sm:py-4 rounded-2xl font-bold text-[14px] sm:text-[15px] items-center justify-center gap-2 hidden lg:flex"
                style={{
                  background: `linear-gradient(135deg, ${C.mintDeep}, ${C.mint})`,
                  color: "#FFFFFF",
                  boxShadow: "0 14px 28px -14px rgba(63,158,124,0.6)",
                }}>
                <span className="text-[18px] leading-none">+</span> Catat
                Transaksi
              </button>

              <div
                className="hidden lg:flex items-start gap-2.5 rounded-2xl p-4"
                style={{
                  background: "#F6C4531F",
                  border: `1.5px solid #F6C45355`,
                }}>
                <span className="text-[16px] flex-shrink-0">💡</span>
                <p
                  className="text-[12.5px] font-semibold leading-snug"
                  style={{ color: C.amberDeep }}>
                  Catat pengeluaran uang untuk belajar mengelola uang dengan
                  baik
                </p>
              </div>
            </div>

            <div className="mt-4 lg:mt-0">
              <Card>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <h3
                      className="font-semibold text-[12px] sm:text-[13px] tracking-[0.08em] uppercase"
                      style={{ color: C.lavender }}>
                      Catatan Harian
                    </h3>
                    <p
                      className="text-[12px] mt-0.5"
                      style={{ color: C.inkFaint }}>
                      {period === "week"
                        ? "7 hari terakhir"
                        : monthLabel(period)}
                    </p>
                  </div>
                  <div className="relative flex-shrink-0">
                    <select
                      value={period}
                      onChange={(e) => setPeriod(e.target.value)}
                      className="appearance-none pl-3 pr-7 py-2 rounded-full text-[11px] sm:text-[12px] font-semibold outline-none"
                      style={{
                        background: "#8B72C41A",
                        color: C.lavender,
                        border: "1px solid #8B72C433",
                      }}>
                      <option value="week">7 Hari Terakhir</option>
                      {availableMonths.map((m) => (
                        <option key={m} value={m}>
                          {monthLabel(m)}
                        </option>
                      ))}
                    </select>
                    <span
                      className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px]"
                      style={{ color: C.lavender }}>
                      ▾
                    </span>
                  </div>
                </div>
                <div className="mt-1 max-h-[26rem] lg:max-h-[34rem] overflow-y-auto pr-1">
                  {transactions.length === 0 && (
                    <div className="py-10 sm:py-12 text-center">
                      <div
                        className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-full flex items-center justify-center text-[26px] sm:text-[28px] mb-3"
                        style={{ background: "#8B72C41A" }}>
                        📝
                      </div>
                      <p
                        className="text-[13.5px] sm:text-[14px] font-medium"
                        style={{ color: C.ink }}>
                        Belum ada transaksi tercatat
                      </p>
                      <p
                        className="text-[12px] sm:text-[12.5px] mt-1"
                        style={{ color: C.inkFaint }}>
                        Yuk mulai catat pemasukan atau pengeluaran hari ini.
                      </p>
                    </div>
                  )}
                  {transactions.length > 0 && byDay.length === 0 && (
                    <div className="py-10 sm:py-12 text-center">
                      <div
                        className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-full flex items-center justify-center text-[26px] sm:text-[28px] mb-3"
                        style={{ background: "#8B72C41A" }}>
                        🔍
                      </div>
                      <p
                        className="text-[13.5px] sm:text-[14px] font-medium"
                        style={{ color: C.ink }}>
                        Tidak ada transaksi di periode ini
                      </p>
                      <p
                        className="text-[12px] sm:text-[12.5px] mt-1"
                        style={{ color: C.inkFaint }}>
                        Coba pilih periode lain di dropdown atas.
                      </p>
                    </div>
                  )}
                  {byDay.map(([date, txs]) => {
                    const dayOut = txs
                      .filter((t) => t.type === "out")
                      .reduce((s, t) => s + t.amount, 0);
                    return (
                      <div
                        key={date}
                        className="py-3 border-b last:border-0"
                        style={{ borderColor: "#463F5C12" }}>
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className="inline-flex items-center px-3 py-1 rounded-full text-[11px] sm:text-[12px] font-semibold"
                            style={{
                              background: "#8B72C41A",
                              color: C.lavender,
                            }}>
                            {formatDay(date)}
                          </span>
                          {dayOut > 0 && (
                            <span
                              className="text-[11px] sm:text-[12px] font-semibold px-2.5 py-1 rounded-full"
                              style={{
                                background: "#F4A6B71F",
                                color: C.roseDeep,
                              }}>
                              -{rupiah(dayOut)}
                            </span>
                          )}
                        </div>
                        <div className="space-y-1">
                          {txs.map((t) => {
                            const meta =
                              t.type === "in"
                                ? { icon: "💰", bg: "#3F9E7C22" }
                                : getCategoryMeta(t.category);
                            return (
                              <div
                                key={t.id}
                                className="flex items-center justify-between gap-2 py-1.5">
                                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                                  <div
                                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center text-[16px] sm:text-[18px] flex-shrink-0"
                                    style={{ background: meta.bg }}>
                                    {meta.icon}
                                  </div>
                                  <div className="min-w-0">
                                    <p
                                      className="text-[13.5px] sm:text-[14.5px] font-medium truncate"
                                      style={{ color: C.ink }}>
                                      {t.note ||
                                        (t.type === "in"
                                          ? "Pemasukan"
                                          : categoryLabel(t.category))}
                                    </p>
                                    <p
                                      className="text-[11px] sm:text-[11.5px]"
                                      style={{ color: C.inkFaint }}>
                                      {t.type === "in"
                                        ? "Pemasukan"
                                        : categoryLabel(t.category)}
                                    </p>
                                  </div>
                                </div>
                                <p
                                  className="text-[14px] sm:text-[15px] font-bold flex-shrink-0"
                                  style={{
                                    color: t.type === "in" ? C.mintDeep : C.ink,
                                  }}>
                                  {t.type === "in" ? "+" : "-"}
                                  {rupiah(t.amount)}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
              <div
                className="flex items-start gap-2.5 rounded-2xl p-3.5 sm:p-4 mt-4 sm:mt-5 lg:hidden"
                style={{
                  background: "#F6C4531F",
                  border: `1.5px solid #F6C45355`,
                }}>
                <span className="text-[15px] sm:text-[16px] flex-shrink-0">
                  💡
                </span>
                <p
                  className="text-[12px] sm:text-[12.5px] font-semibold leading-snug"
                  style={{ color: C.amberDeep }}>
                  Catat pengeluaran uang untuk belajar mengelola uang dengan
                  baik
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="text-center mt-6 lg:mt-8">
          <button
            onClick={() => setShowChangePassword(true)}
            className="text-[12px] font-medium"
            style={{ color: C.inkFaint }}>
            Ganti Password
          </button>
        </div>
      </div>

      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-6 right-5 sm:right-8 lg:hidden w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-[26px] sm:text-[30px] font-light"
        style={{
          background: `linear-gradient(135deg, ${C.mintDeep}, ${C.mint})`,
          color: "#FFFFFF",
          boxShadow: "0 14px 30px -10px rgba(63,158,124,0.6)",
        }}>
        +
      </button>

      {showForm && (
        <TransactionForm
          onSave={addTransaction}
          onClose={() => setShowForm(false)}
        />
      )}

      {showChangePassword && (
        <ChangePasswordModal
          user={user}
          onClose={() => setShowChangePassword(false)}
        />
      )}
    </div>
  );
}
