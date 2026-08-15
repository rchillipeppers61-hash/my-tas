// src/pages/catatan/groqClient.js
//
// Helper functions untuk integrasi Groq API:
// 1. transcribeAudio()  -> Whisper (speech-to-text)
// 2. generateNotes()    -> LLM (rapiin transcript jadi catatan terstruktur)
//
// ASUMSI: VITE_GROQ_API_KEY sudah ada di .env
//   VITE_GROQ_API_KEY=gsk_xxxxxxxxxxxx

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

// Model Whisper Groq buat transcription (cepat & akurat buat Bahasa Indonesia)
const WHISPER_MODEL = "whisper-large-v3-turbo";

// Model LLM Groq buat merapikan catatan (cepat, cocok buat tugas terstruktur)
const LLM_MODEL = "llama-3.3-70b-versatile";

class GroqError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "GroqError";
    this.cause = cause;
  }
}

function assertApiKey() {
  if (!GROQ_API_KEY) {
    throw new GroqError(
      "VITE_GROQ_API_KEY belum diset di .env. Tambahkan dulu sebelum pakai fitur AI.",
    );
  }
}

/**
 * Transcribe audio blob jadi teks mentah pakai Groq Whisper.
 * @param {Blob} audioBlob - hasil rekaman (webm/mp3/wav/m4a)
 * @returns {Promise<string>} teks hasil transcribe
 */
export async function transcribeAudio(audioBlob) {
  assertApiKey();

  const formData = new FormData();
  formData.append("file", audioBlob, "rekaman.webm");
  formData.append("model", WHISPER_MODEL);
  formData.append("language", "id"); // Bahasa Indonesia
  formData.append("response_format", "text");

  let response;
  try {
    response = await fetch(`${GROQ_BASE_URL}/audio/transcriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: formData,
    });
  } catch (err) {
    throw new GroqError("Gagal menghubungi Groq (cek koneksi internet).", err);
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new GroqError(
      `Transcribe gagal (${response.status}). ${errText}`.trim(),
    );
  }

  const text = await response.text();
  return text.trim();
}

/**
 * Ubah transcript mentah jadi catatan kuliah terstruktur pakai Groq LLM.
 * @param {string} transcript - hasil dari transcribeAudio()
 * @param {object} opts
 * @param {string} [opts.namaMataKuliah] - konteks nama mata kuliah, biar hasil lebih relevan
 * @returns {Promise<string>} catatan dalam format markdown
 */
export async function generateNotes(transcript, opts = {}) {
  assertApiKey();

  if (!transcript || !transcript.trim()) {
    throw new GroqError("Transcript kosong, tidak ada yang bisa dirapikan.");
  }

  const { namaMataKuliah } = opts;

  const systemPrompt = `Kamu adalah asisten yang merapikan transcript kuliah menjadi catatan belajar yang jelas dan terstruktur.

Aturan:
- Tulis dalam Bahasa Indonesia yang natural, sesuai gaya transcript aslinya (jangan mengubah istilah teknis/asing).
- Format markdown: gunakan heading kecil (##) per subtopik, bullet point untuk poin-poin, dan **bold** untuk istilah penting.
- Buang kata pengisi/filler dari transcript (misal "eee", "jadi gini", pengulangan), tapi JANGAN buang informasi.
- Jangan menambah informasi yang tidak ada di transcript. Kalau ada bagian yang tidak jelas, biarkan apa adanya, jangan mengarang.
- Output HANYA berupa catatan markdown, tanpa basa-basi pembuka/penutup.`;

  const userPrompt = namaMataKuliah
    ? `Mata kuliah: ${namaMataKuliah}\n\nTranscript:\n${transcript}`
    : `Transcript:\n${transcript}`;

  let response;
  try {
    response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });
  } catch (err) {
    throw new GroqError("Gagal menghubungi Groq (cek koneksi internet).", err);
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new GroqError(
      `Generate catatan gagal (${response.status}). ${errText}`.trim(),
    );
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new GroqError("Groq tidak mengembalikan hasil catatan.");
  }

  return content.trim();
}

/**
 * Shortcut: audio -> transcript -> catatan rapi, sekaligus.
 * @param {Blob} audioBlob
 * @param {object} opts - sama seperti generateNotes()
 * @returns {Promise<{ transcript: string, catatan: string }>}
 */
export async function audioToCatatan(audioBlob, opts = {}) {
  const transcript = await transcribeAudio(audioBlob);
  const catatan = await generateNotes(transcript, opts);
  return { transcript, catatan };
}

export { GroqError };
