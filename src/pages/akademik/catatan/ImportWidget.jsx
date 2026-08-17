// src/pages/catatan/ImportWidget.jsx
//
// Import catatan dari sumber lain:
// - Foto tulisan tangan (kamera langsung / pilih dari galeri) -> dibaca
//   pakai model vision Groq
// - File PDF (mis. slide dosen) -> teksnya diekstrak langsung di browser
//
// PENTING: beda sama RecorderWidget yang auto-save langsung, hasil import
// di sini SENGAJA gak langsung disimpan. Hasilnya cuma dikirim ke parent
// lewat onDraftReady() buat ditaro di kotak "ketik manual" -- biar user bisa
// review & edit dulu sebelum klik "Simpan catatan". Ini penting karena hasil
// OCR (apalagi tulisan tangan orang lain) bisa aja salah baca, dan catatan
// ini rencananya jadi dokumentasi penting.
//
// Props:
// - namaMataKuliah?: string
// - onDraftReady: (text: string) => void  -> dipanggil pas hasil siap direview
// - onError?: (message: string) => void

import { useRef, useState } from "react";
import {
  recognizeHandwrittenImage,
  generateNotes,
  GroqError,
} from "./groqClient";
import { extractPdfText } from "./pdfImport";

const STATUS = {
  IDLE: "idle",
  READING: "reading", // baca gambar / ekstrak PDF
  GENERATING: "generating", // rapiin jadi catatan
  ERROR: "error",
};

const STATUS_LABEL = {
  [STATUS.READING]: "Membaca file...",
  [STATUS.GENERATING]: "Merapikan jadi catatan...",
};

export default function ImportWidget({
  namaMataKuliah,
  onDraftReady,
  onError,
}) {
  const [status, setStatus] = useState(STATUS.IDLE);
  const [errorMsg, setErrorMsg] = useState("");

  const imageInputRef = useRef(null);
  const pdfInputRef = useRef(null);

  const isProcessing =
    status === STATUS.READING || status === STATUS.GENERATING;

  function handleError(err) {
    console.error(err);
    const msg =
      err instanceof GroqError || err instanceof Error
        ? err.message
        : "Terjadi kesalahan saat memproses file.";
    setStatus(STATUS.ERROR);
    setErrorMsg(msg);
    onError?.(msg);
  }

  async function handleImageFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // biar bisa pilih file yang sama lagi kalau perlu
    if (!file) return;

    setErrorMsg("");
    setStatus(STATUS.READING);
    try {
      const transcript = await recognizeHandwrittenImage(file, {
        namaMataKuliah,
      });
      setStatus(STATUS.GENERATING);
      const catatan = await generateNotes(transcript, { namaMataKuliah });
      setStatus(STATUS.IDLE);
      onDraftReady?.(catatan);
    } catch (err) {
      handleError(err);
    }
  }

  async function handlePdfFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setErrorMsg("");
    setStatus(STATUS.READING);
    try {
      const transcript = await extractPdfText(file);
      setStatus(STATUS.GENERATING);
      const catatan = await generateNotes(transcript, { namaMataKuliah });
      setStatus(STATUS.IDLE);
      onDraftReady?.(catatan);
    } catch (err) {
      handleError(err);
    }
  }

  function reset() {
    setStatus(STATUS.IDLE);
    setErrorMsg("");
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-violet-100 bg-violet-50/60 px-5 py-6">
      {status === STATUS.ERROR && (
        <div className="w-full rounded-xl bg-red-50 px-4 py-2 text-center text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {isProcessing && (
        <div className="flex flex-col items-center gap-2 py-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
          <p className="text-sm text-slate-500">{STATUS_LABEL[status]}</p>
        </div>
      )}

      {!isProcessing && (
        <div className="flex w-full flex-col gap-2 sm:flex-row">
          <button
            onClick={
              status === STATUS.ERROR
                ? reset
                : () => imageInputRef.current?.click()
            }
            className="flex flex-1 min-h-[44px] items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-violet-700 shadow-sm transition hover:bg-violet-100">
            📷 Foto catatan
          </button>
          <button
            onClick={
              status === STATUS.ERROR
                ? reset
                : () => pdfInputRef.current?.click()
            }
            className="flex flex-1 min-h-[44px] items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-violet-700 shadow-sm transition hover:bg-violet-100">
            📄 File PDF
          </button>
        </div>
      )}

      {!isProcessing && status !== STATUS.ERROR && (
        <p className="text-center text-xs text-slate-400">
          Hasilnya muncul di kotak teks di bawah buat kamu review & edit dulu
          sebelum disimpan.
        </p>
      )}

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleImageFile}
      />
      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handlePdfFile}
      />
    </div>
  );
}
