// src/pages/catatan/CatatanCaptureBar.jsx
//
// Gabungan 4 cara capture catatan jadi 1 baris ikon compact, nyebar rata
// kiri-kanan di layar HP:
// 🎙️ Rekam suara | 📷 Foto catatan | 📄 File PDF | 📝 File Word
//
// Sengaja digabung dari yang tadinya RecorderWidget.jsx + ImportWidget.jsx
// terpisah (masing-masing box gede), biar panel "Catatan baru" gak makan
// tempat, dan textarea manual di bawahnya dapet ruang lebih luas.
//
// Behavior beda antara rekam suara vs import (SENGAJA beda, bukan bug):
// - Rekam suara -> onRecordResult() -> auto-save langsung jadi catatan baru
// - Foto/PDF/Word -> onDraftReady() -> ditaro di textarea manual dulu buat
//                  direview/diedit, BARU disimpan manual. Soalnya hasil OCR
//                  (apalagi tulisan tangan orang lain) bisa aja salah baca.
//
// Props:
// - namaMataKuliah?: string
// - onRecordResult: ({ transcript, catatan }) => void
// - onDraftReady: (text: string) => void
// - onError?: (message: string) => void

import { useRef, useState } from "react";
import {
  transcribeAudio,
  generateNotes,
  recognizeHandwrittenImage,
  GroqError,
} from "./groqClient";
import { extractPdfText } from "./pdfImport";
import { extractDocxText } from "./docxImport";

const STATUS = {
  IDLE: "idle",
  RECORDING: "recording",
  TRANSCRIBING: "transcribing",
  GENERATING: "generating",
  READING_IMAGE: "reading_image",
  READING_PDF: "reading_pdf",
  READING_DOCX: "reading_docx",
  ERROR: "error",
};

const STATUS_LABEL = {
  [STATUS.TRANSCRIBING]: "Mentranskrip audio...",
  [STATUS.GENERATING]: "Merapikan jadi catatan...",
  [STATUS.READING_IMAGE]: "Membaca foto...",
  [STATUS.READING_PDF]: "Membaca PDF...",
  [STATUS.READING_DOCX]: "Membaca file Word...",
};

// Safari/iOS gak support "audio/webm" sama sekali (limitation Apple, bukan
// soal versi browser). Urutan preferensi: webm/opus (Chrome/Android/Desktop)
// -> mp4/aac (Safari/iOS) -> biarin browser pilih default kalau gak match.
function pickSupportedMimeType() {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) {
    return "";
  }
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/aac",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

export default function CatatanCaptureBar({
  namaMataKuliah,
  onRecordResult,
  onDraftReady,
  onError,
}) {
  const [status, setStatus] = useState(STATUS.IDLE);
  const [seconds, setSeconds] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);
  const mimeTypeRef = useRef("");
  const imageInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const wordInputRef = useRef(null);

  const isRecording = status === STATUS.RECORDING;
  const isProcessing = [
    STATUS.TRANSCRIBING,
    STATUS.GENERATING,
    STATUS.READING_IMAGE,
    STATUS.READING_PDF,
    STATUS.READING_DOCX,
  ].includes(status);
  const isBusy = isRecording || isProcessing;

  function handleError(err, fallbackMsg) {
    console.error(err);
    const msg =
      err instanceof GroqError || err instanceof Error
        ? err.message
        : fallbackMsg;
    setStatus(STATUS.ERROR);
    setErrorMsg(msg);
    onError?.(msg);
  }

  function reset() {
    setStatus(STATUS.IDLE);
    setErrorMsg("");
    setSeconds(0);
  }

  // --- Rekam suara ---

  async function startRecording() {
    if (typeof MediaRecorder === "undefined") {
      handleError(
        null,
        "Browser ini gak support rekam suara. Coba pakai Chrome atau Safari versi terbaru.",
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickSupportedMimeType();
      mimeTypeRef.current = mimeType;

      const mediaRecorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = handleRecordingStop;

      mediaRecorder.start();
      setErrorMsg("");
      setStatus(STATUS.RECORDING);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (err) {
      handleError(
        err,
        "Gak bisa akses mikrofon. Cek izin mikrofon di browser/HP.",
      );
    }
  }

  function stopRecording() {
    clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }

  async function handleRecordingStop() {
    const actualType =
      mediaRecorderRef.current?.mimeType || mimeTypeRef.current || "audio/webm";
    const audioBlob = new Blob(chunksRef.current, { type: actualType });
    chunksRef.current = [];

    if (audioBlob.size === 0) {
      setStatus(STATUS.IDLE);
      return;
    }

    try {
      setStatus(STATUS.TRANSCRIBING);
      const transcript = await transcribeAudio(audioBlob);
      setStatus(STATUS.GENERATING);
      const catatan = await generateNotes(transcript, { namaMataKuliah });

      setStatus(STATUS.IDLE);
      setSeconds(0);
      onRecordResult?.({ transcript, catatan });
    } catch (err) {
      handleError(err, "Terjadi kesalahan saat memproses rekaman.");
    }
  }

  // --- Import foto & PDF ---

  async function handleImageFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setErrorMsg("");
    setStatus(STATUS.READING_IMAGE);
    try {
      const transcript = await recognizeHandwrittenImage(file, {
        namaMataKuliah,
      });
      setStatus(STATUS.GENERATING);
      const catatan = await generateNotes(transcript, { namaMataKuliah });
      setStatus(STATUS.IDLE);
      onDraftReady?.(catatan);
    } catch (err) {
      handleError(err, "Terjadi kesalahan saat memproses foto.");
    }
  }

  async function handlePdfFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setErrorMsg("");
    setStatus(STATUS.READING_PDF);
    try {
      const transcript = await extractPdfText(file);
      setStatus(STATUS.GENERATING);
      const catatan = await generateNotes(transcript, { namaMataKuliah });
      setStatus(STATUS.IDLE);
      onDraftReady?.(catatan);
    } catch (err) {
      handleError(err, "Terjadi kesalahan saat memproses PDF.");
    }
  }

  async function handleWordFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setErrorMsg("");
    setStatus(STATUS.READING_DOCX);
    try {
      const transcript = await extractDocxText(file);
      setStatus(STATUS.GENERATING);
      const catatan = await generateNotes(transcript, { namaMataKuliah });
      setStatus(STATUS.IDLE);
      onDraftReady?.(catatan);
    } catch (err) {
      handleError(err, "Terjadi kesalahan saat memproses file Word.");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2 sm:justify-start sm:gap-8">
        <CaptureButton
          icon={isRecording ? <StopIcon /> : <MicIcon />}
          label={isRecording ? "Berhenti" : "Rekam suara"}
          active={isRecording}
          disabled={isProcessing}
          onClick={
            status === STATUS.ERROR
              ? reset
              : isRecording
                ? stopRecording
                : startRecording
          }
        />
        <CaptureButton
          icon={<CameraIcon />}
          label="Foto catatan"
          disabled={isBusy}
          onClick={
            status === STATUS.ERROR
              ? reset
              : () => imageInputRef.current?.click()
          }
        />
        <CaptureButton
          icon={<PdfIcon />}
          label="File PDF"
          disabled={isBusy}
          onClick={
            status === STATUS.ERROR ? reset : () => pdfInputRef.current?.click()
          }
        />
        <CaptureButton
          icon={<WordIcon />}
          label="File Word"
          disabled={isBusy}
          onClick={
            status === STATUS.ERROR
              ? reset
              : () => wordInputRef.current?.click()
          }
        />
      </div>

      {status === STATUS.ERROR && (
        <p className="mt-2 text-sm text-red-600">{errorMsg}</p>
      )}

      {isRecording && (
        <p className="mt-2 font-mono text-sm font-semibold text-slate-700">
          {formatTime(seconds)}
        </p>
      )}

      {isProcessing && (
        <div className="mt-2 flex items-center gap-2">
          <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
          <span className="text-sm text-slate-500">{STATUS_LABEL[status]}</span>
        </div>
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
      <input
        ref={wordInputRef}
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={handleWordFile}
      />
    </div>
  );
}

function CaptureButton({ icon, label, onClick, disabled, active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-1 disabled:opacity-40">
      <span
        className="flex h-12 w-12 items-center justify-center rounded-full text-xl shadow-sm transition active:scale-95"
        style={{
          background: active ? "#ef4444" : "#7c3aed14",
          color: active ? "#FFFFFF" : "#7c3aed",
        }}>
        {icon}
      </span>
      <span className="text-[11px] font-medium text-slate-500">{label}</span>
    </button>
  );
}

function MicIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <rect x="5" y="5" width="14" height="14" rx="2" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function PdfIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="15" x2="15" y2="15" />
      <line x1="9" y1="11" x2="11" y2="11" />
    </svg>
  );
}

function WordIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M7.5 12.5l1.2 6 1.3-4.5 1.3 4.5 1.2-6" />
    </svg>
  );
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
