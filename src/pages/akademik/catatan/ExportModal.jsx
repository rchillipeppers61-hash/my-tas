// src/pages/catatan/ExportModal.jsx
//
// Modal buat milih catatan mana aja yang mau di-export ke PDF.
// - Default: semua catatan ke-centang pas modal dibuka.
// - Kalau yang dicentang cuma 1 -> caller export single PDF.
// - Kalau lebih dari 1 -> caller gabungin jadi 1 PDF (kronologis).
// Layout: bottom-sheet penuh di mobile (gampang dijangkau jempol), dialog
// center di layar >= sm.

import { useEffect, useState } from "react";
import { stripMarkdownSyntax } from "./pdfExport";

export default function ExportModal({ open, catatanList, onClose, onConfirm }) {
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  // Reset seleksi ke "semua ke-centang" setiap kali modal dibuka.
  useEffect(() => {
    if (open) {
      setSelectedIds(new Set(catatanList.map((c) => c.id)));
    }
  }, [open, catatanList]);

  // Tutup modal pas tekan Escape.
  useEffect(() => {
    if (!open) return;
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const allSelected = selectedIds.size === catatanList.length;
  const noneSelected = selectedIds.size === 0;

  function toggle(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds(
      allSelected ? new Set() : new Set(catatanList.map((c) => c.id)),
    );
  }

  function handleConfirm() {
    const selected = catatanList.filter((c) => selectedIds.has(c.id));
    if (selected.length === 0) return;
    onConfirm(selected);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-[2px] sm:items-center"
      onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full flex-col rounded-t-3xl bg-white shadow-xl sm:max-w-lg sm:rounded-3xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="font-serif text-lg font-bold text-slate-900">
              Export ke PDF
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Pilih catatan yang mau di-export
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <CloseIcon />
          </button>
        </div>

        {/* Pilih semua */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-2.5">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="h-4 w-4 accent-violet-600"
            />
            Pilih semua
          </label>
          <span className="text-xs text-slate-400">
            {selectedIds.size} / {catatanList.length} dipilih
          </span>
        </div>

        {/* List catatan */}
        <div className="flex-1 overflow-y-auto px-5 py-2">
          {catatanList.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">
              Belum ada catatan.
            </p>
          )}
          {catatanList.map((c) => {
            const checked = selectedIds.has(c.id);
            const preview = stripMarkdownSyntax(c.isi).slice(0, 90);
            return (
              <label
                key={c.id}
                className="flex cursor-pointer items-start gap-3 border-b border-slate-50 py-3 last:border-b-0">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(c.id)}
                  className="mt-1 h-4 w-4 shrink-0 accent-violet-600"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-violet-700">
                    {formatDateTime(c.updated_at)}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-slate-600">
                    {preview || "(kosong)"}
                  </p>
                </div>
              </label>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">
            Batal
          </button>
          <button
            onClick={handleConfirm}
            disabled={noneSelected}
            className="rounded-full bg-violet-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40">
            {selectedIds.size <= 1
              ? "Export PDF"
              : `Gabung & Export (${selectedIds.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
