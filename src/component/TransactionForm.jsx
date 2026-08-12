import { useState } from "react";
import { C } from "./theme";
import { CATEGORIES } from "../lib/shared";

export default function TransactionForm({ onSave, onClose }) {
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
