import { useState } from "react";
import { C } from "../../lib/theme";
import { rupiah, formatThousands, stripThousands } from "../../lib/format";
import { CATEGORIES } from "./constants";

// ============================================================
// TransactionForm — modal tambah/edit transaksi (dipakai di
// ChildDashboard).
// ============================================================
const CATEGORY_ICONS = {
  makan: "🍜",
  jajan: "🍿",
  transport: "🚌",
  kuliah: "📚",
  pribadi: "🧴",
  lainnya: "✨",
};

const inputClass =
  "w-full mt-1.5 mb-3.5 px-3.5 py-3.5 sm:py-3 rounded-2xl text-[15px] sm:text-[14.5px] outline-none border-[1.5px] transition-shadow focus:ring-4 focus:ring-[#8B72C42A]";

export function TransactionForm({ transaction, onSave, onDelete, onClose }) {
  const isEditing = Boolean(transaction);
  const [form, setForm] = useState({
    type: transaction?.type || "out",
    amount: transaction?.amount != null ? String(transaction.amount) : "",
    note: transaction?.note || "",
    category: transaction?.category || "makan",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  const isOut = form.type === "out";

  async function handleSave() {
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0 || !form.note.trim()) {
      setError("Isi jumlah dan catatan dulu ya.");
      return;
    }
    setError("");
    setSaving(true);
    const ok = await onSave({
      id: transaction?.id,
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

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setError("");
    setDeleting(true);
    const ok = await onDelete(transaction.id);
    setDeleting(false);
    if (ok) {
      onClose();
    } else {
      setError("Gagal menghapus transaksi, coba lagi.");
      setConfirmDelete(false);
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center z-50 px-0 sm:px-4"
      style={{ background: "rgba(70,63,92,0.45)", backdropFilter: "blur(2px)" }}
      onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-sm lg:max-w-md rounded-t-[32px] sm:rounded-[32px] p-5 sm:p-7 pb-8 sm:pb-7 relative"
        style={{
          background: "#FFFFFF",
          boxShadow: "0 30px 60px -20px rgba(70,63,92,0.35)",
        }}>
        <div
          className="w-10 h-1 rounded-full mx-auto mb-4 sm:hidden"
          style={{ background: "#463F5C22" }}
        />

        <button
          onClick={onClose}
          className="hidden sm:flex absolute top-5 right-5 w-8 h-8 rounded-full items-center justify-center text-[14px] font-bold"
          style={{ background: "#463F5C0f", color: C.inkSoft }}>
          ✕
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center text-[20px] sm:text-[22px] flex-shrink-0 transition-colors"
            style={{ background: isOut ? "#F4A6B72A" : "#8FD8BE2A" }}>
            {isOut ? "🧾" : "💰"}
          </div>
          <div>
            <h3
              style={{ fontFamily: "'Fraunces', serif", color: C.ink }}
              className="text-[19px] sm:text-[21px] font-semibold leading-tight">
              {isEditing ? "Edit Transaksi" : "Catat Transaksi"}
            </h3>
            <p
              className="text-[12px] sm:text-[12.5px]"
              style={{ color: C.inkFaint }}>
              {isEditing
                ? "Ubah atau hapus catatan ini"
                : isOut
                  ? "Tulis pengeluaranmu"
                  : "Tulis pemasukanmu"}
            </p>
          </div>
        </div>

        <div
          className="flex rounded-2xl p-1.5 mb-5 gap-1.5"
          style={{ background: "#463F5C0d" }}>
          <button
            onClick={() => setForm((f) => ({ ...f, type: "out" }))}
            className="flex-1 py-2.5 sm:py-3 rounded-xl text-[13px] sm:text-[13.5px] font-bold transition-all">
            <span
              style={{
                background: isOut
                  ? `linear-gradient(135deg, ${C.roseDeep}, ${C.rose})`
                  : "transparent",
                color: isOut ? "#FFFFFF" : C.inkSoft,
              }}
              className="block -m-2.5 sm:-m-3 py-2.5 sm:py-3 rounded-xl">
              ⬇️ Pengeluaran
            </span>
          </button>
          <button
            onClick={() => setForm((f) => ({ ...f, type: "in" }))}
            className="flex-1 py-2.5 sm:py-3 rounded-xl text-[13px] sm:text-[13.5px] font-bold transition-all">
            <span
              style={{
                background: !isOut
                  ? `linear-gradient(135deg, ${C.mintDeep}, ${C.mint})`
                  : "transparent",
                color: !isOut ? "#FFFFFF" : C.inkSoft,
              }}
              className="block -m-2.5 sm:-m-3 py-2.5 sm:py-3 rounded-xl">
              ⬆️ Pemasukan
            </span>
          </button>
        </div>

        <label
          className="text-[11px] uppercase tracking-wide font-bold"
          style={{ color: C.inkFaint }}>
          Jumlah (Rp)
        </label>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={formatThousands(form.amount)}
          onChange={(e) =>
            setForm((f) => ({ ...f, amount: stripThousands(e.target.value) }))
          }
          placeholder="25.000"
          className={inputClass}
          style={{
            background: "#463F5C08",
            color: C.ink,
            borderColor: "#463F5C1F",
          }}
        />

        {isOut && (
          <>
            <label
              className="text-[11px] uppercase tracking-wide font-bold"
              style={{ color: C.inkFaint }}>
              Kategori
            </label>
            <div className="relative">
              <select
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value }))
                }
                className={`${inputClass} appearance-none pr-9`}
                style={{
                  background: "#463F5C08",
                  color: C.ink,
                  borderColor: "#463F5C1F",
                }}>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {CATEGORY_ICONS[c.value] || "✨"} {c.label}
                  </option>
                ))}
              </select>
              <span
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 -mt-1.5 text-[12px]"
                style={{ color: C.inkFaint }}>
                ▾
              </span>
            </div>
          </>
        )}

        <label
          className="text-[11px] uppercase tracking-wide font-bold"
          style={{ color: C.inkFaint }}>
          Catatan
        </label>
        <input
          type="text"
          value={form.note}
          onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
          placeholder={isOut ? "Makan siang di kantin" : "Kiriman dari Mamah"}
          className={`${inputClass} mb-2`}
          style={{
            background: "#463F5C08",
            color: C.ink,
            borderColor: "#463F5C1F",
          }}
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
          className="w-full py-3.5 sm:py-4 rounded-2xl font-bold text-[14px] sm:text-[15px] disabled:opacity-50 transition-shadow"
          style={{
            background: isOut
              ? `linear-gradient(135deg, ${C.roseDeep}, ${C.rose})`
              : `linear-gradient(135deg, ${C.mintDeep}, ${C.mint})`,
            color: "#FFFFFF",
            boxShadow: isOut
              ? "0 14px 28px -14px rgba(217,96,122,0.6)"
              : "0 14px 28px -14px rgba(63,158,124,0.6)",
          }}>
          {saving ? "Menyimpan..." : isEditing ? "Simpan Perubahan" : "Simpan"}
        </button>

        {isEditing && (
          <button
            onClick={handleDelete}
            disabled={saving || deleting}
            className="w-full mt-2.5 py-3 sm:py-3.5 rounded-2xl font-bold text-[13px] sm:text-[13.5px] disabled:opacity-50 transition-colors"
            style={{
              background: confirmDelete ? C.roseDeep : "#463F5C0f",
              color: confirmDelete ? "#FFFFFF" : C.roseDeep,
            }}>
            {deleting
              ? "Menghapus..."
              : confirmDelete
                ? "Yakin? Tap sekali lagi untuk hapus"
                : "🗑️ Hapus Transaksi"}
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// SavingsGoalItem — baris progress satu target nabung.
//
// Dua mode:
// - Read-only (dipakai di ParentDashboard): cuma `goal`, gak ada
//   tombol aksi. Progress bar berdasar goal.saved_amount vs
//   goal.target_amount.
// - Editable (dipakai di ChildDashboard): pass `editable` + handler
//   onEdit/onDeposit/onWithdraw/onDelete. Munculin tombol Setor,
//   Tarik, Edit, Hapus -- masing-masing buka form inline kecil.
//
// PENTING soal konsep: `saved_amount` itu alokasi mental per-goal,
// TERPISAH dari `saldo` (yang dihitung dari total transaksi). Setor
// / tarik ke goal TIDAK bikin record transaksi baru -- itu cuma
// mindah "label" dari saldo yang sama, bukan pemasukan/pengeluaran
// beneran. Makanya laporan pengeluaran gak keganggu sama aktivitas
// nabung ini.
// ============================================================
const smallInputClass =
  "w-full px-3 py-2.5 rounded-xl text-[13px] outline-none border-[1.5px]";
const smallInputStyle = {
  background: "#463F5C08",
  color: C.ink,
  borderColor: "#463F5C1F",
};

export function SavingsGoalItem({
  goal,
  editable = false,
  onDelete,
  onEdit,
  onDeposit,
  onWithdraw,
  availableToAllocate = 0,
}) {
  const [mode, setMode] = useState(null); // null | "deposit" | "withdraw" | "edit"
  const [amount, setAmount] = useState("");
  const [editTitle, setEditTitle] = useState(goal.title);
  const [editTarget, setEditTarget] = useState(String(goal.target_amount));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const saved = Number(goal.saved_amount || 0);
  const pct = Math.max(
    0,
    Math.min(100, Math.round((saved / goal.target_amount) * 100)),
  );
  const achieved = saved >= goal.target_amount;

  function closeMode() {
    setMode(null);
    setAmount("");
    setError("");
    setEditTitle(goal.title);
    setEditTarget(String(goal.target_amount));
  }

  async function handleDeposit() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setError("Isi jumlah dulu ya.");
      return;
    }
    setError("");
    setSaving(true);
    const result = await onDeposit(goal.id, amt);
    setSaving(false);
    if (result?.ok) {
      closeMode();
    } else {
      setError(result?.error || "Gagal menyimpan, coba lagi.");
    }
  }

  async function handleWithdraw() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setError("Isi jumlah dulu ya.");
      return;
    }
    setError("");
    setSaving(true);
    const result = await onWithdraw(goal.id, amt);
    setSaving(false);
    if (result?.ok) {
      closeMode();
    } else {
      setError(result?.error || "Gagal menyimpan, coba lagi.");
    }
  }

  async function handleEditSave() {
    const target = parseFloat(editTarget);
    if (!editTitle.trim() || !target || target <= 0) {
      setError("Isi nama & target dengan benar ya.");
      return;
    }
    setError("");
    setSaving(true);
    const ok = await onEdit(goal.id, {
      title: editTitle.trim(),
      target_amount: target,
    });
    setSaving(false);
    if (ok) {
      closeMode();
    } else {
      setError("Gagal menyimpan perubahan, coba lagi.");
    }
  }

  async function handleDeleteClick() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await onDelete(goal.id);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-[13px] mb-1">
        <span
          className="font-medium truncate flex items-center gap-1.5"
          style={{ color: C.ink }}>
          {achieved ? "🏆" : "🎯"} {goal.title}
        </span>
        <span style={{ color: C.inkFaint }}>
          {rupiah(Math.min(saved, goal.target_amount))} /{" "}
          {rupiah(goal.target_amount)}
        </span>
      </div>
      <div
        className="h-2.5 rounded-full overflow-hidden"
        style={{ background: "#463F5C14" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: achieved
              ? `linear-gradient(135deg, ${C.mintDeep}, ${C.mint})`
              : `linear-gradient(135deg, ${C.lavender}, ${C.skyDeep})`,
          }}
        />
      </div>
      {achieved && (
        <p
          className="text-[11px] mt-1 font-semibold"
          style={{ color: C.mintDeep }}>
          🎉 Target tercapai!
        </p>
      )}

      {editable && mode === null && (
        <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
          <button
            onClick={() => setMode("deposit")}
            className="text-[11px] font-bold px-2.5 py-2 rounded-lg min-h-[36px]"
            style={{ background: "#8B72C41A", color: C.lavender }}>
            💰 Setor
          </button>
          <button
            onClick={() => setMode("withdraw")}
            disabled={saved <= 0}
            className="text-[11px] font-bold px-2.5 py-2 rounded-lg min-h-[36px] disabled:opacity-40"
            style={{ background: "#9FCBF02A", color: C.skyDeep }}>
            💸 Tarik
          </button>
          <button
            onClick={() => setMode("edit")}
            className="text-[11px] font-bold px-2.5 py-2 rounded-lg min-h-[36px]"
            style={{ background: "#463F5C0f", color: C.ink }}>
            ✏️ Edit
          </button>
          <button
            onClick={handleDeleteClick}
            className="text-[11px] font-bold px-2.5 py-2 rounded-lg min-h-[36px] ml-auto"
            style={{
              background: confirmDelete ? C.roseDeep : "#463F5C0f",
              color: confirmDelete ? "#FFFFFF" : C.roseDeep,
            }}>
            {confirmDelete ? "Yakin?" : "🗑️"}
          </button>
        </div>
      )}

      {editable && (mode === "deposit" || mode === "withdraw") && (
        <div className="mt-2.5 space-y-2">
          {mode === "deposit" && (
            <p className="text-[11px]" style={{ color: C.inkFaint }}>
              Bisa disisihkan: {rupiah(Math.max(0, availableToAllocate))}
            </p>
          )}
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={formatThousands(amount)}
            onChange={(e) => setAmount(stripThousands(e.target.value))}
            placeholder="Jumlah (Rp)"
            className={smallInputClass}
            style={smallInputStyle}
          />
          {error && (
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-[11.5px] font-medium"
              style={{ background: "#F4A6B71F", color: C.roseDeep }}>
              ⚠️ {error}
            </div>
          )}
          <div className="flex gap-1.5">
            <button
              onClick={mode === "deposit" ? handleDeposit : handleWithdraw}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl font-bold text-[13px] disabled:opacity-50"
              style={{
                background:
                  mode === "deposit"
                    ? `linear-gradient(135deg, ${C.lavender}, ${C.skyDeep})`
                    : `linear-gradient(135deg, ${C.skyDeep}, ${C.sky})`,
                color: "#FFFFFF",
              }}>
              {saving ? "Menyimpan..." : mode === "deposit" ? "Setor" : "Tarik"}
            </button>
            <button
              onClick={closeMode}
              className="px-4 py-2.5 rounded-xl font-bold text-[13px]"
              style={{ background: "#463F5C0f", color: C.ink }}>
              Batal
            </button>
          </div>
        </div>
      )}

      {editable && mode === "edit" && (
        <div className="mt-2.5 space-y-2">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Nama target"
            className={smallInputClass}
            style={smallInputStyle}
          />
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={formatThousands(editTarget)}
            onChange={(e) => setEditTarget(stripThousands(e.target.value))}
            placeholder="Target (Rp)"
            className={smallInputClass}
            style={smallInputStyle}
          />
          {error && (
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-[11.5px] font-medium"
              style={{ background: "#F4A6B71F", color: C.roseDeep }}>
              ⚠️ {error}
            </div>
          )}
          <div className="flex gap-1.5">
            <button
              onClick={handleEditSave}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl font-bold text-[13px] disabled:opacity-50"
              style={{
                background: `linear-gradient(135deg, ${C.lavender}, ${C.skyDeep})`,
                color: "#FFFFFF",
              }}>
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
            <button
              onClick={closeMode}
              className="px-4 py-2.5 rounded-xl font-bold text-[13px]"
              style={{ background: "#463F5C0f", color: C.ink }}>
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
