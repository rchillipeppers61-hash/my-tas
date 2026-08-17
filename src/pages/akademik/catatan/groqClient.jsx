// src/pages/catatan/groqClient.jsx
//
// Helper functions untuk integrasi Groq API:
// 1. transcribeAudio()          -> Whisper (speech-to-text, dari rekaman)
// 2. generateNotes()            -> LLM (rapiin transcript jadi catatan terstruktur)
// 3. recognizeHandwrittenImage() -> Vision (baca teks dari foto tulisan tangan)
//
// ASUMSI: VITE_GROQ_API_KEY sudah ada di .env
//   VITE_GROQ_API_KEY=gsk_xxxxxxxxxxxx

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

// Model Whisper Groq buat transcription (cepat & akurat buat Bahasa Indonesia)
const WHISPER_MODEL = "whisper-large-v3-turbo";

// Model LLM Groq buat merapikan catatan (cepat, cocok buat tugas terstruktur)
//
// CATATAN PENTING: sebelumnya di sini "llama-3.3-70b-versatile", tapi model
// itu udah di-deprecate Groq (diumumin 17 Juni 2026). Ganti ke
// "openai/gpt-oss-120b" sesuai rekomendasi resmi Groq. Kalau suatu saat
// Groq deprecate lagi, cek https://console.groq.com/docs/deprecations
const LLM_MODEL = "openai/gpt-oss-120b";

// Model vision Groq buat baca teks dari gambar (foto tulisan tangan, dsb).
// Per Agustus 2026 ini masih berstatus PREVIEW di Groq (bisa ganti/hilang
// sewaktu-waktu), bukan model production. Kalau nemu error/model gak ada,
// cek daftar model vision terbaru di https://console.groq.com/docs/vision
const VISION_MODEL = "qwen/qwen3.6-27b";

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

// Groq Whisper nebak format audio dari EKSTENSI nama file, jadi ekstensi ini
// harus sesuai mime type asli blob-nya (mis. Safari/iOS ngerekam sebagai
// audio/mp4, bukan audio/webm kayak Chrome/Android).
function extensionFromMimeType(mimeType) {
  if (!mimeType) return "webm";
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("aac")) return "aac";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("wav")) return "wav";
  return "webm";
}

// Ubah File/Blob jadi data URL base64, dipakai buat kirim gambar ke Groq
// vision API (format image_url butuh data URL, bukan raw blob).
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Gagal membaca file gambar."));
    reader.readAsDataURL(blob);
  });
}

/**
 * Transcribe audio blob jadi teks mentah pakai Groq Whisper.
 * @param {Blob} audioBlob - hasil rekaman (webm/mp3/wav/m4a)
 * @returns {Promise<string>} teks hasil transcribe
 */
export async function transcribeAudio(audioBlob) {
  assertApiKey();

  const ext = extensionFromMimeType(audioBlob.type);

  const formData = new FormData();
  formData.append("file", audioBlob, `rekaman.${ext}`);
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
 * Baca teks dari foto (mis. foto tulisan tangan catatan kuliah) pakai model
 * vision Groq. Hasilnya teks mentah apa adanya -- BUKAN dirapikan, itu tugas
 * generateNotes() setelah ini.
 *
 * @param {Blob|File} imageBlob - foto (jpg/png/webp, dsb), maks ~20MB
 * @param {object} [opts]
 * @param {string} [opts.namaMataKuliah] - konteks buat AI, opsional
 * @returns {Promise<string>} teks hasil baca gambar
 */
export async function recognizeHandwrittenImage(imageBlob, opts = {}) {
  assertApiKey();

  const dataUrl = await blobToDataUrl(imageBlob);
  const { namaMataKuliah } = opts;

  const promptText = `Baca dan tuliskan ulang SEMUA teks tulisan tangan yang ada di foto ini apa adanya, sepersis mungkin.

Aturan:
- Jangan mengubah, meringkas, atau menambah informasi apapun. Tulis persis seperti aslinya.
- Kalau ada bagian yang gak kebaca/gak jelas, tandai dengan "[tidak terbaca]" di bagian itu, jangan menebak-nebak.
- Kalau ada coretan, panah, atau struktur (misal poin bernomor, sub-poin menjorok), coba pertahankan strukturnya di teks.
- Output HANYA teks hasil baca, tanpa komentar/analisis tambahan, tanpa basa-basi pembuka atau penutup.${
    namaMataKuliah
      ? `\n\nKonteks: ini catatan mata kuliah "${namaMataKuliah}".`
      : ""
  }`;

  let response;
  try {
    response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: promptText },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        temperature: 0.1,
      }),
    });
  } catch (err) {
    throw new GroqError("Gagal menghubungi Groq (cek koneksi internet).", err);
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new GroqError(
      `Baca gambar gagal (${response.status}). ${errText}`.trim(),
    );
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new GroqError("Groq tidak berhasil membaca teks dari gambar ini.");
  }

  return content.trim();
}

/**
 * Ubah transcript mentah jadi catatan kuliah terstruktur pakai Groq LLM.
 * Dipakai buat hasil dari transcribeAudio() MAUPUN recognizeHandwrittenImage()
 * MAUPUN teks ekstraksi PDF -- sumbernya beda-beda, tapi tahap "rapiin jadi
 * catatan"-nya sama.
 * @param {string} transcript - teks mentah (dari suara/gambar/PDF)
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

/**
 * Shortcut: foto tulisan tangan -> transcript -> catatan rapi, sekaligus.
 * @param {Blob|File} imageBlob
 * @param {object} opts - sama seperti generateNotes()
 * @returns {Promise<{ transcript: string, catatan: string }>}
 */
export async function imageToCatatan(imageBlob, opts = {}) {
  const transcript = await recognizeHandwrittenImage(imageBlob, opts);
  const catatan = await generateNotes(transcript, opts);
  return { transcript, catatan };
}

export { GroqError };
