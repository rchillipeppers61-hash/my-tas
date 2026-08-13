import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { C, FONT_IMPORT } from "./theme";
import Card from "./Card";
import {
  CATEGORIES,
  categoryLabel,
  rupiah,
  formatDay,
  LOW_BALANCE_LIMIT,
} from "../lib/shared";

export default function ParentDashboard({ user, onLogout }) {
  const [childName, setChildName] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLowBalance, setShowLowBalance] = useState(false);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    setLoading(true);

    if (!user.linked_child_id) {
      setLoading(false);
      return;
    }

    const { data: childData } = await supabase
      .from("users")
      .select("username")
      .eq("id", user.linked_child_id)
      .single();

    if (childData) setChildName(childData.username);

    const { data: txData } = await supabase
      .from("transactions")
      .select("*")
      .eq("owner_id", user.linked_child_id)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    setTransactions(txData || []);
    setLoading(false);
  }

  const summary = useMemo(() => {
    const totalIn = transactions
      .filter((t) => t.type === "in")
      .reduce((s, t) => s + Number(t.amount), 0);
    const totalOut = transactions
      .filter((t) => t.type === "out")
      .reduce((s, t) => s + Number(t.amount), 0);
    const balance = totalIn - totalOut;

    const byCategory = {};
    transactions
      .filter((t) => t.type === "out")
      .forEach((t) => {
        byCategory[t.category] =
          (byCategory[t.category] || 0) + Number(t.amount);
      });

    const categoryRows = Object.entries(byCategory)
      .map(([cat, amt]) => ({
        cat,
        amt,
        pct: totalOut > 0 ? (amt / totalOut) * 100 : 0,
      }))
      .sort((a, b) => b.amt - a.amt);

    return { totalIn, totalOut, balance, categoryRows };
  }, [transactions]);

  const grouped = useMemo(() => {
    const map = {};
    transactions.forEach((t) => {
      if (!map[t.date]) map[t.date] = [];
      map[t.date].push(t);
    });
    return Object.entries(map).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [transactions]);

  useEffect(() => {
    if (!loading && summary.balance < LOW_BALANCE_LIMIT) {
      setShowLowBalance(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, summary.balance]);

  if (loading) {
    return (
      <div
        className="min-h-screen w-full flex items-center justify-center"
        style={{ background: C.bg }}>
        <p style={{ color: C.inkFaint }}>Memuat...</p>
      </div>
    );
  }

  if (!user.linked_child_id) {
    return (
      <div
        className="min-h-screen w-full flex items-center justify-center px-4"
        style={{ background: C.bg }}>
        <Card>
          <p style={{ color: C.ink }}>
            Akun ini belum terhubung ke akun anak. Hubungi admin untuk mengatur{" "}
            <code>linked_child_id</code>.
          </p>
          <button
            onClick={onLogout}
            className="mt-4 px-4 py-2 rounded-2xl text-sm font-semibold"
            style={{ background: C.lavenderSoft, color: "#fff" }}>
            Keluar
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen w-full px-4 py-6 sm:py-10"
      style={{ background: C.bg, fontFamily: "'Inter', sans-serif" }}>
      <style>{FONT_IMPORT}</style>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p
              className="text-[11px] tracking-[0.2em] uppercase font-semibold"
              style={{ color: C.lavender }}>
              Pantauan Orang Tua
            </p>
            <h1
              style={{ fontFamily: "'Fraunces', serif", color: C.ink }}
              className="text-[24px] font-semibold">
              Keuangan{" "}
              {childName
                ? childName.charAt(0).toUpperCase() + childName.slice(1)
                : "Anak"}
            </h1>
          </div>
          <button
            onClick={onLogout}
            className="text-[13px] font-semibold px-3.5 py-2 rounded-2xl"
            style={{ background: "#463F5C0f", color: C.ink }}>
            Keluar
          </button>
        </div>

        {showLowBalance && (
          <div
            className="fixed inset-0 flex items-end sm:items-center justify-center z-50 px-4 pb-4 sm:pb-4"
            style={{ background: "rgba(70,63,92,0.4)" }}
            onClick={() => setShowLowBalance(false)}>
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-sm rounded-[28px] p-6 sm:p-7 text-center"
              style={{
                background: "#FFFFFF",
                boxShadow: "0 24px 56px -20px rgba(70,63,92,0.35)",
              }}>
              <div
                className="w-14 h-14 mx-auto rounded-full flex items-center justify-center text-[26px] font-bold mb-4"
                style={{ background: "#D9607A1a", color: C.roseDeep }}>
                !
              </div>
              <h3
                style={{ fontFamily: "'Fraunces', serif", color: C.ink }}
                className="text-[20px] font-semibold leading-snug">
                Saldo {childName || "anak"} tinggal {rupiah(summary.balance)}{" "}
                nih!!
              </h3>
              <p
                className="text-[13.5px] mt-2 leading-relaxed"
                style={{ color: C.inkSoft }}>
                Sudah di bawah batas {rupiah(LOW_BALANCE_LIMIT)}. Saatnya kirim
                uang buat dia.
              </p>
              <button
                onClick={() => setShowLowBalance(false)}
                className="w-full mt-6 py-3.5 rounded-2xl font-semibold text-[14px]"
                style={{
                  background: `linear-gradient(135deg, ${C.lavender}, ${C.lavenderSoft})`,
                  color: "#FFFFFF",
                }}>
                Siap, dicatat!
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 mb-4 sm:grid sm:grid-cols-3">
          <Card title="Saldo">
            <p
              className="text-[20px] font-semibold"
              style={{ color: C.ink, fontFamily: "'Fraunces', serif" }}>
              {rupiah(summary.balance)}
            </p>
          </Card>
          <div className="grid grid-cols-2 gap-3 sm:contents">
            <Card title="Masuk">
              <p
                className="text-[18px] font-semibold"
                style={{ color: C.mintDeep }}>
                {rupiah(summary.totalIn)}
              </p>
            </Card>
            <Card title="Keluar">
              <p
                className="text-[18px] font-semibold"
                style={{ color: C.roseDeep }}>
                {rupiah(summary.totalOut)}
              </p>
            </Card>
          </div>
        </div>

        <Card title="Pengeluaran per Kategori" className="mb-4">
          {summary.categoryRows.length === 0 ? (
            <p className="text-[13px]" style={{ color: C.inkFaint }}>
              Belum ada pengeluaran tercatat.
            </p>
          ) : (
            <div className="space-y-3">
              {summary.categoryRows.map((row) => (
                <div key={row.cat}>
                  <div className="flex justify-between text-[13px] mb-1">
                    <span style={{ color: C.ink }}>
                      {categoryLabel(row.cat)}
                    </span>
                    <span style={{ color: C.inkFaint }}>
                      {rupiah(row.amt)} ({row.pct.toFixed(0)}%)
                    </span>
                  </div>
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{ background: "#463F5C14" }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${row.pct}%`,
                        background: C.lavender,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card
          title="Riwayat Transaksi"
          sub="Detail lengkap, tidak dapat diedit dari sini">
          {grouped.length === 0 ? (
            <p className="text-[13px]" style={{ color: C.inkFaint }}>
              Belum ada transaksi.
            </p>
          ) : (
            <div className="space-y-5">
              {grouped.map(([date, items]) => (
                <div key={date}>
                  <p
                    className="text-[12px] font-semibold mb-2"
                    style={{ color: C.inkFaint }}>
                    {formatDay(date)}
                  </p>
                  <div className="space-y-2">
                    {items.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between py-2 px-3 rounded-2xl"
                        style={{ background: "#463F5C08" }}>
                        <div>
                          <p
                            className="text-[14px] font-medium"
                            style={{ color: C.ink }}>
                            {t.note || categoryLabel(t.category)}
                          </p>
                          <p
                            className="text-[11px]"
                            style={{ color: C.inkFaint }}>
                            {t.type === "out"
                              ? categoryLabel(t.category)
                              : "Pemasukan"}
                          </p>
                        </div>
                        <p
                          className="text-[14px] font-semibold"
                          style={{
                            color: t.type === "in" ? C.mintDeep : C.roseDeep,
                          }}>
                          {t.type === "in" ? "+" : "-"}
                          {rupiah(t.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
