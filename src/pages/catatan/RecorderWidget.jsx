// src/pages/catatan/RecorderWidget.jsx
//
// Komponen rekam audio di browser (MediaRecorder API), lalu kirim ke Groq
// buat di-transcribe (Whisper) dan dirapikan jadi catatan (LLM).
// Audio TIDAK disimpan ke storage manapun — cuma dipakai sementara di
// memory browser, lalu dibuang setelah diproses (sesuai keputusan awal:
// cukup simpan hasil teksnya aja).
//
// Props:
// - namaMataKuliah?: string  -> konteks buat AI, bikin hasil lebih relevan
// - onResult: ({ transcript, catatan }) => void  -> dipanggil pas hasil AI siap
// - onError?: (message: string) => void

import { useRef, useState } from "react";
import { audioToCatatan, GroqError } from "./groqClient";

const STATUS = {
  IDLE: "idle",
  RECORDING: "recording",
  TRANSCRIBING: "transcribing",
  GENERATING: "generating",
  ERROR: "error",
};

export default function RecorderWidget({ namaMataKuliah, onResult, onError }) {
  const [status, setStatus] = useState(STATUS.IDLE);
  const [seconds, setSeconds] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  async function startRecording() {
    setErrorMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = handleStop;

      mediaRecorder.start();
      setStatus(STATUS.RECORDING);
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      console.error(err);
      const msg = "Gak bisa akses mikrofon. Cek izin mikrofon di browser/HP.";
      setStatus(STATUS.ERROR);
      setErrorMsg(msg);
      onError?.(msg);
    }
  }

  function stopRecording() {
    clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }

  async function handleStop() {
    const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
    chunksRef.current = [];

    if (audioBlob.size === 0) {
      setStatus(STATUS.IDLE);
      return;
    }

    try {
      // Catatan: audioToCatatan menggabungkan transcribe + generate.
      // Kalau mau tampilkan status "Mentranskrip..." vs "Merapikan..." secara
      // presisi, panggil transcribeAudio() dan generateNotes() terpisah -
      // di sini kita perkirakan transisi status secara optimistic.
      setStatus(STATUS.TRANSCRIBING);
      const transcribeTimer = setTimeout(
        () => setStatus(STATUS.GENERATING),
        1500,
      );

      const { transcript, catatan } = await audioToCatatan(audioBlob, {
        namaMataKuliah,
      });
      clearTimeout(transcribeTimer);

      setStatus(STATUS.IDLE);
      setSeconds(0);
      onResult?.({ transcript, catatan });
    } catch (err) {
      console.error(err);
      const msg =
        err instanceof GroqError
          ? err.message
          : "Terjadi kesalahan saat memproses rekaman.";
      setStatus(STATUS.ERROR);
      setErrorMsg(msg);
      onError?.(msg);
    }
  }

  function reset() {
    setStatus(STATUS.IDLE);
    setErrorMsg("");
    setSeconds(0);
  }

  const isRecording = status === STATUS.RECORDING;
  const isProcessing =
    status === STATUS.TRANSCRIBING || status === STATUS.GENERATING;

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-violet-100 bg-violet-50/60 px-5 py-6">
      {status === STATUS.ERROR && (
        <div className="w-full rounded-xl bg-red-50 px-4 py-2 text-center text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {!isRecording && !isProcessing && (
        <button
          onClick={status === STATUS.ERROR ? reset : startRecording}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-600 text-2xl text-white shadow-md transition hover:bg-violet-700 active:scale-95"
          aria-label="Mulai rekam">
          🎙️
        </button>
      )}

      {isRecording && (
        <button
          onClick={stopRecording}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-2xl text-white shadow-md transition hover:bg-red-600 active:scale-95"
          aria-label="Berhenti rekam">
          ⏹️
        </button>
      )}

      {isProcessing && (
        <div className="flex h-16 w-16 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
        </div>
      )}

      <div className="text-center">
        {isRecording && (
          <p className="font-mono text-lg font-semibold text-slate-700">
            {formatTime(seconds)}
          </p>
        )}
        {status === STATUS.TRANSCRIBING && (
          <p className="text-sm text-slate-500">Mentranskrip audio...</p>
        )}
        {status === STATUS.GENERATING && (
          <p className="text-sm text-slate-500">Merapikan jadi catatan...</p>
        )}
        {status === STATUS.IDLE && (
          <p className="text-sm text-slate-500">Tekan buat mulai rekam kelas</p>
        )}
      </div>
    </div>
  );
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
