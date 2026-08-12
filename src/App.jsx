import { useEffect, useState, useMemo } from "react";
import { supabase } from "./supabaseClient";
import { C, FONT_IMPORT } from "./component/theme";
import Login from "./component/Login";
import ParentDashboard from "./component/ParentDashboard";

import {
  CATEGORIES,
  categoryLabel,
  rupiah,
  todayISO,
  formatDay,
  daysBetween,
} from "./lib/shared";

function Card({ children, title, sub, className = "" }) {
  return (
    <div
      className={`rounded-3xl p-5 sm:p-6 ${className}`}
      style={{
        background: C.card,
        boxShadow:
          "0 1px 0 rgba(70,63,92,0.04), 0 12px 28px -16px rgba(70,63,92,0.22)",
      }}>
      {title && (
        <div className="mb-2">
          <h3
            className="font-semibold text-[12px] sm:text-[13px] tracking-[0.08em] uppercase"
            style={{ color: C.lavender }}>
            {title}
          </h3>
          {sub && (
            <p className="text-[12px] mt-0.5" style={{ color: C.inkFaint }}>
              {sub}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

function TransactionForm({ onSave, onClose }) {
  const [form, setForm] = useState({
    type: "out",
    amount: "",
    note: "",
    category: "makan",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0 || !form.note.trim()) {
      setError("Isi jumlah dan catatan dulu ya.");
      return;
    }
    setError("");
    setSaving(true);
    const ok = await onSave({
      type: form.type,
      amount: amt,
      note: form.note.trim(),
      category: form.type === "out" ? form.category : "lainnya",
    });
    setSaving(false);
    if (ok) {
      onClose();
    } else {
      setError("Gagal menyimpan transaksi, coba lagi.");
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center z-50 px-0 sm:px-4"
      style={{ background: "rgba(70,63,92,0.35)" }}
      onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 pb-8 sm:pb-6"
        style={{ background: "#FFFFFF" }}>
        <div
          className="w-10 h-1 rounded-full mx-auto mb-4 sm:hidden"
          style={{ background: "#463F5C22" }}
        />
        <h3
          style={{ fontFamily: "'Fraunces', serif" }}
          className="text-[19px] font-semibold mb-4">
          Catat Transaksi
        </h3>

        <div
          className="flex rounded-full p-1 mb-4"
          style={{ background: "#463F5C0d" }}>
          <button
            onClick={() => setForm((f) => ({ ...f, type: "out" }))}
            className="flex-1 py-2 rounded-full text-[12px] font-semibold transition-colors"
            style={{
              background: form.type === "out" ? C.rose : "transparent",
              color: form.type === "out" ? "#FFFFFF" : C.inkSoft,
            }}>
            Pengeluaran
          </button>
          <button
            onClick={() => setForm((f) => ({ ...f, type: "in" }))}
            className="flex-1 py-2 rounded-full text-[12px] font-semibold transition-colors"
            style={{
              background: form.type === "in" ? C.mint : "transparent",
              color: form.type === "in" ? "#FFFFFF" : C.inkSoft,
            }}>
            Pemasukan
          </button>
        </div>

        <label
          className="text-[11px] uppercase tracking-wide font-medium"
          style={{ color: C.inkFaint }}>
          Jumlah (Rp)
        </label>
        <input
          type="number"
          value={form.amount}
          onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          placeholder="25000"
          className="w-full mt-1.5 mb-3 px-3.5 py-3 rounded-2xl text-[15px] outline-none"
          style={{ background: "#463F5C0a", color: C.ink }}
        />

        {form.type === "out" && (
          <>
            <label
              className="text-[11px] uppercase tracking-wide font-medium"
              style={{ color: C.inkFaint }}>
              Kategori
            </label>
            <select
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({ ...f, category: e.target.value }))
              }
              className="w-full mt-1.5 mb-3 px-3.5 py-3 rounded-2xl text-[15px] outline-none"
              style={{ background: "#463F5C0a", color: C.ink }}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </>
        )}

        <label
          className="text-[11px] uppercase tracking-wide font-medium"
          style={{ color: C.inkFaint }}>
          Catatan
        </label>
        <input
          type="text"
          value={form.note}
          onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
          placeholder={
            form.type === "in" ? "Kiriman dari Ayah" : "Makan siang di kantin"
          }
          className="w-full mt-1.5 mb-2 px-3.5 py-3 rounded-2xl text-[15px] outline-none"
          style={{ background: "#463F5C0a", color: C.ink }}
        />

        {error && (
          <p className="text-[12px] mb-3" style={{ color: C.roseDeep }}>
            {error}
          </p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3.5 rounded-2xl font-semibold text-[14px] disabled:opacity-50"
          style={{ background: C.lavenderSoft, color: "#FFFFFF" }}>
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
      </div>
    </div>
  );
}

function Dashboard({ user, onLogout }) {
  const [transactions, setTransactions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

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
  const avgOutPerDay = transactions.length
    ? Math.round(
        totalOut /
          daysBetween(
            transactions.reduce(
              (min, t) => (t.date < min ? t.date : min),
              transactions[0].date,
            ),
            todayISO(),
          ),
      )
    : 0;

  const byDay = useMemo(() => {
    const map = {};
    transactions.forEach((t) => {
      (map[t.date] = map[t.date] || []).push(t);
    });
    return Object.entries(map).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [transactions]);

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

      <div className="relative max-w-md sm:max-w-xl lg:max-w-4xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-28 lg:pb-16">
        <div className="flex items-center justify-between mb-5 sm:mb-8">
          <div>
            <p
              className="text-[11px] tracking-[0.2em] uppercase font-semibold"
              style={{ color: C.lavender }}>
              Buku Kas
            </p>
            <h1
              style={{ fontFamily: "'Fraunces', serif" }}
              className="text-[26px] sm:text-[34px] font-semibold leading-tight">
              My Wallet
            </h1>
          </div>
          <button
            onClick={onLogout}
            className="text-[12px] font-medium"
            style={{ color: C.inkSoft }}>
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
          <div className="lg:grid lg:grid-cols-[minmax(0,320px)_1fr] lg:gap-6 lg:items-start">
            <div className="lg:sticky lg:top-8 flex flex-col gap-4">
              <Card>
                <p
                  className="text-[11px] uppercase tracking-[0.1em] font-medium"
                  style={{ color: C.inkFaint }}>
                  Saldo Sekarang
                </p>
                <p
                  style={{
                    fontFamily: "'Fraunces', serif",
                    color: saldo < 0 ? C.roseDeep : C.ink,
                  }}
                  className="text-[32px] sm:text-[36px] font-semibold leading-tight mt-0.5">
                  {rupiah(saldo)}
                </p>
                <div
                  className="grid grid-cols-3 gap-2 mt-4 pt-4"
                  style={{ borderTop: "1px solid #463F5C14" }}>
                  <div
                    className="rounded-2xl p-2.5"
                    style={{ background: "#8FD8BE22" }}>
                    <p
                      className="text-[9px] uppercase tracking-wide font-medium"
                      style={{ color: C.inkFaint }}>
                      Masuk
                    </p>
                    <p
                      className="text-[12px] sm:text-[13px] font-bold mt-0.5"
                      style={{ color: C.mintDeep }}>
                      {rupiah(totalIn)}
                    </p>
                  </div>
                  <div
                    className="rounded-2xl p-2.5"
                    style={{ background: "#F4A6B722" }}>
                    <p
                      className="text-[9px] uppercase tracking-wide font-medium"
                      style={{ color: C.inkFaint }}>
                      Keluar
                    </p>
                    <p
                      className="text-[12px] sm:text-[13px] font-bold mt-0.5"
                      style={{ color: C.roseDeep }}>
                      {rupiah(totalOut)}
                    </p>
                  </div>
                  <div
                    className="rounded-2xl p-2.5"
                    style={{ background: "#B9A6E022" }}>
                    <p
                      className="text-[9px] uppercase tracking-wide font-medium"
                      style={{ color: C.inkFaint }}>
                      Rata²/Hari
                    </p>
                    <p
                      className="text-[12px] sm:text-[13px] font-bold mt-0.5"
                      style={{ color: C.lavender }}>
                      {rupiah(avgOutPerDay)}
                    </p>
                  </div>
                </div>
              </Card>

              <button
                onClick={() => setShowForm(true)}
                className="w-full py-3.5 rounded-2xl font-semibold text-[14px] items-center justify-center gap-2 hidden lg:flex"
                style={{ background: C.lavenderSoft, color: "#FFFFFF" }}>
                <span className="text-[18px] leading-none">+</span> Catat
                Transaksi
              </button>
              <p
                className="text-center text-[16px] hidden lg:block"
                style={{ fontFamily: "'Caveat', cursive", color: C.lavender }}>
                "catat baik-baik, biar nanti nggak nyesel di akhir bulan ✎"
              </p>
            </div>

            <div className="mt-4 lg:mt-0">
              <Card
                title="Catatan Harian"
                sub="Setiap hari, catat sebelum lupa">
                <div className="mt-1 max-h-[26rem] lg:max-h-[34rem] overflow-y-auto pr-1">
                  {byDay.length === 0 && (
                    <p
                      className="text-[13px] py-4 text-center"
                      style={{ color: C.inkFaint }}>
                      Belum ada transaksi tercatat.
                    </p>
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
                        <div className="flex items-center justify-between mb-1.5">
                          <p
                            className="text-[12px] font-semibold"
                            style={{ color: C.lavender }}>
                            {formatDay(date)}
                          </p>
                          {dayOut > 0 && (
                            <p
                              className="text-[12px] font-medium"
                              style={{ color: C.inkFaint }}>
                              -{rupiah(dayOut)}
                            </p>
                          )}
                        </div>
                        {txs.map((t) => (
                          <div
                            key={t.id}
                            className="flex items-center justify-between py-1.5">
                            <div className="flex items-center gap-2">
                              <span
                                className="text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold"
                                style={{
                                  background:
                                    t.type === "in" ? "#8FD8BE33" : "#F4A6B733",
                                  color:
                                    t.type === "in" ? C.mintDeep : C.roseDeep,
                                }}>
                                {t.type === "in" ? "+" : "–"}
                              </span>
                              <p className="text-[13px] sm:text-[14px]">
                                {t.note}
                              </p>
                            </div>
                            <p
                              className="text-[13px] sm:text-[14px] font-medium"
                              style={{
                                color: t.type === "in" ? C.mintDeep : C.ink,
                              }}>
                              {t.type === "in" ? "+" : ""}
                              {rupiah(t.amount)}
                            </p>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </Card>
              <p
                className="text-center mt-5 text-[16px] lg:hidden"
                style={{ fontFamily: "'Caveat', cursive", color: C.lavender }}>
                "catat baik-baik, biar nanti nggak nyesel di akhir bulan ✎"
              </p>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-6 right-6 sm:right-10 lg:hidden w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-2xl sm:text-3xl font-light shadow-lg"
        style={{
          background: C.lavenderSoft,
          color: "#FFFFFF",
          boxShadow: "0 10px 24px -8px rgba(139,114,196,0.55)",
        }}>
        +
      </button>

      {showForm && (
        <TransactionForm
          onSave={addTransaction}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("mywallet_user");
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        localStorage.removeItem("mywallet_user");
      }
    }
    setLoading(false);
  }, []);

  function handleLogout() {
    localStorage.removeItem("mywallet_user");
    setUser(null);
  }

  if (loading) {
    return (
      <div
        className="min-h-screen w-full flex items-center justify-center"
        style={{ background: C.bg, color: C.inkFaint }}>
        Memuat...
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={setUser} />;
  }

  if (user.role === "orang_tua") {
    return <ParentDashboard user={user} onLogout={handleLogout} />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
}
