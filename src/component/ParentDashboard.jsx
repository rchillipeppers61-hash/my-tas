import ExcelJS from "exceljs";
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
  capitalize,
  monthLabel,
  todayISO,
} from "../lib/shared";

export default function ParentDashboard({ user, onLogout }) {
  const [childName, setChildName] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLowBalance, setShowLowBalance] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportEmptyMonth, setExportEmptyMonth] = useState(null);

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
      .select("nama_lengkap")
      .eq("id", user.linked_child_id)
      .single();

    if (childData) setChildName(childData.nama_lengkap);

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

  const months = useMemo(() => {
    const set = new Set(transactions.map((t) => t.date.slice(0, 7)));
    set.add(todayISO().slice(0, 7));
    return Array.from(set).sort((a, b) => (a < b ? 1 : -1));
  }, [transactions]);

  useEffect(() => {
    if (!selectedMonth && months.length > 0) {
      setSelectedMonth(months[0]);
    }
  }, [months, selectedMonth]);

  const monthTransactions = useMemo(
    () => transactions.filter((t) => t.date.slice(0, 7) === selectedMonth),
    [transactions, selectedMonth],
  );

  const grouped = useMemo(() => {
    const map = {};
    monthTransactions.forEach((t) => {
      if (!map[t.date]) map[t.date] = [];
      map[t.date].push(t);
    });
    return Object.entries(map).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [monthTransactions]);

  async function exportToExcel(targetMonth) {
    const month = targetMonth || selectedMonth;
    const rows = transactions
      .filter((t) => t.date.slice(0, 7) === month)
      .slice()
      .sort((a, b) => (a.date < b.date ? -1 : 1));

    if (rows.length === 0) {
      setExportEmptyMonth(month);
      return false;
    }

    const wb = new ExcelJS.Workbook();
    wb.creator = "My Wallet";
    wb.created = new Date();

    const ws = wb.addWorksheet(monthLabel(month));
    ws.columns = [
      { key: "tanggal", width: 14 },
      { key: "tipe", width: 10 },
      { key: "kategori", width: 22 },
      { key: "catatan", width: 30 },
      { key: "jumlah", width: 16 },
    ];

    const titleRow = ws.addRow(["DATA PENGELUARAN UANG"]);
    ws.mergeCells(`A${titleRow.number}:E${titleRow.number}`);
    titleRow.font = { bold: true, size: 14, color: { argb: "FF463F5C" } };
    titleRow.height = 22;

    const subRow = ws.addRow([`Bulan : ${monthLabel(month)}`]);
    ws.mergeCells(`A${subRow.number}:E${subRow.number}`);
    subRow.font = { italic: true, color: { argb: "FF8B72C4" } };

    ws.addRow([]);
    ws.addRow([]);

    const headerRow = ws.addRow([
      "Tanggal",
      "Tipe",
      "Kategori",
      "Catatan",
      "Jumlah",
    ]);
    headerRow.height = 22;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF8B72C4" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    rows.forEach((t) => {
      const row = ws.addRow([
        t.date,
        t.type === "in" ? "Masuk" : "Keluar",
        t.type === "out" ? categoryLabel(t.category) : "-",
        t.note || "",
        Number(t.amount),
      ]);
      row.getCell(5).numFmt = '"Rp"#,##0';
      row.getCell(2).font = {
        bold: true,
        color: { argb: t.type === "in" ? "FF3F9E7C" : "FFD9607A" },
      };
    });

    const totalIn = rows
      .filter((t) => t.type === "in")
      .reduce((s, t) => s + Number(t.amount), 0);
    const totalOut = rows
      .filter((t) => t.type === "out")
      .reduce((s, t) => s + Number(t.amount), 0);

    const firstTotalRowNumber = ws.lastRow.number + 1;
    [
      ["Total Masuk", totalIn],
      ["Total Keluar", totalOut],
      ["Selisih", totalIn - totalOut],
    ].forEach(([label, value]) => {
      const row = ws.addRow(["", "", label, "", value]);
      row.font = { bold: true };
      row.getCell(5).numFmt = '"Rp"#,##0';
    });

    const thin = { style: "thin", color: { argb: "FFCBC3E8" } };
    for (let r = headerRow.number; r < firstTotalRowNumber; r++) {
      const row = ws.getRow(r);
      for (let c = 1; c <= 5; c++) {
        row.getCell(c).border = {
          top: thin,
          bottom: thin,
          left: thin,
          right: thin,
        };
      }
    }
    for (let r = firstTotalRowNumber; r <= ws.lastRow.number; r++) {
      ws.getRow(r).getCell(5).border = { top: thin, bottom: thin };
    }

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `riwayat-${(childName || "anak").toLowerCase()}-${month}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  }

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
        style={{ background: C.bgParent }}>
        <p style={{ color: C.inkFaint }}>Memuat...</p>
      </div>
    );
  }

  if (!user.linked_child_id) {
    return (
      <div
        className="min-h-screen w-full flex items-center justify-center px-4"
        style={{ background: C.bgParent }}>
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
      className="min-h-screen w-full px-4 py-6 sm:py-10 relative overflow-hidden"
      style={{ background: C.bgParent, fontFamily: "'Inter', sans-serif" }}>
      <style>{FONT_IMPORT}</style>
      <div className="fixed inset-0 pointer-events-none overflow-hidden hidden sm:block">
        <div
          className="absolute -top-24 -right-16 w-72 h-72 rounded-full opacity-40 blur-3xl"
          style={{ background: C.sky }}
        />
        <div
          className="absolute bottom-0 -left-24 w-72 h-72 rounded-full opacity-30 blur-3xl"
          style={{ background: C.mint }}
        />
      </div>
      <div className="max-w-2xl mx-auto relative">
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
              Keuangan {childName ? capitalize(childName) : "Anak"}
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
                border: `1.5px solid ${C.amber}`,
                boxShadow: "0 24px 56px -20px rgba(70,63,92,0.35)",
              }}>
              <div
                className="w-14 h-14 mx-auto rounded-full flex items-center justify-center text-[26px] font-bold mb-4"
                style={{ background: "#F6C4532e", color: C.amberDeep }}>
                !
              </div>
              <h3
                style={{ fontFamily: "'Fraunces', serif", color: C.ink }}
                className="text-[20px] font-semibold leading-snug">
                Saldo {capitalize(childName) || "anak"} tinggal{" "}
                {rupiah(summary.balance)}
              </h3>
              <p
                className="text-[13.5px] mt-2 leading-relaxed"
                style={{ color: C.inkSoft }}>
                Sudah di bawah batas {rupiah(LOW_BALANCE_LIMIT)}.
              </p>
              <p
                className="text-[17px] font-bold mt-1.5 leading-snug"
                style={{ color: C.ink }}>
                Saatnya kirim uang buat dia.
              </p>
              <button
                onClick={() => setShowLowBalance(false)}
                className="w-full mt-6 py-3.5 rounded-2xl font-semibold text-[14px]"
                style={{
                  background: `linear-gradient(135deg, ${C.amberDeep}, ${C.amber})`,
                  color: "#FFFFFF",
                }}>
                Siap, dicatat!
              </button>
            </div>
          </div>
        )}

        {showExportModal && (
          <div
            className="fixed inset-0 flex items-end sm:items-center justify-center z-50 px-4 pb-4 sm:pb-4"
            style={{ background: "rgba(70,63,92,0.4)" }}
            onClick={() => setShowExportModal(false)}>
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-sm rounded-[28px] p-6 sm:p-7"
              style={{
                background: "#FFFFFF",
                boxShadow: "0 24px 56px -20px rgba(70,63,92,0.35)",
              }}>
              <h3
                style={{ fontFamily: "'Fraunces', serif", color: C.ink }}
                className="text-[18px] font-semibold mb-1">
                Export bulan mana?
              </h3>
              <p className="text-[12.5px] mb-4" style={{ color: C.inkFaint }}>
                Data akan diunduh sebagai file Excel (.xlsx)
              </p>
              <div className="space-y-1.5 max-h-72 overflow-y-auto -mx-1 px-1">
                {months.map((m) => (
                  <div key={m}>
                    <button
                      onClick={async () => {
                        const ok = await exportToExcel(m);
                        if (ok !== false) setShowExportModal(false);
                      }}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-[13.5px] font-medium"
                      style={{ background: "#463F5C0a", color: C.ink }}>
                      {monthLabel(m)}
                      <span style={{ color: C.mintDeep }}>↓</span>
                    </button>
                    {exportEmptyMonth === m && (
                      <p
                        className="text-[12px] mt-1 mb-1 px-1"
                        style={{ color: C.roseDeep }}>
                        Belum ada transaksi di bulan ini.
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="w-full mt-4 py-3 rounded-2xl text-[13px] font-semibold"
                style={{ background: "#463F5C0f", color: C.ink }}>
                Batal
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
          {months.length > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <div className="flex gap-1.5 overflow-x-auto flex-1 pb-1">
                {months.map((m) => (
                  <button
                    key={m}
                    onClick={() => setSelectedMonth(m)}
                    className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition-colors"
                    style={{
                      background:
                        m === selectedMonth ? C.lavender : "#463F5C0d",
                      color: m === selectedMonth ? "#FFFFFF" : C.inkSoft,
                    }}>
                    {monthLabel(m)}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  setExportEmptyMonth(null);
                  setShowExportModal(true);
                }}
                disabled={months.length === 0}
                className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-semibold disabled:opacity-40"
                style={{ background: C.mintDeep, color: "#FFFFFF" }}>
                Export Excel
              </button>
            </div>
          )}
          {grouped.length === 0 ? (
            <p className="text-[13px]" style={{ color: C.inkFaint }}>
              Belum ada transaksi{selectedMonth ? " di bulan ini" : ""}.
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
