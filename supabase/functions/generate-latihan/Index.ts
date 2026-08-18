// supabase/functions/generate-latihan/index.ts
//
// Proxy ke Groq buat generate soal latihan. Dipanggil dari browser lewat
// supabase.functions.invoke("generate-latihan", { body }) -- API key Groq
// disimpan sebagai secret di server (GROQ_API_KEY), TIDAK pernah dikirim
// ke browser. Ini beda sama pola groqClient.jsx yang dipakai fitur
// Catatan Kuliah (itu manggil Groq langsung dari client pakai
// VITE_GROQ_API_KEY -- artinya key-nya ke-bundle ke browser. Kalau ada
// waktu, worth dipertimbangkan buat fitur Catatan juga dipindah lewat
// edge function serupa ini, biar key Groq lo gak ke-expose publik).
//
// Deploy:
//   supabase functions deploy generate-latihan
//   supabase secrets set GROQ_API_KEY=gsk_xxxxxxxxxxxx

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const LLM_MODEL = "openai/gpt-oss-120b";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const JUMLAH_SOAL_DEFAULT = { quick: 5, study: 12, exam: 25 };

function buildSystemPrompt(adaSumberCatatan) {
  return `Kamu adalah pembuat soal latihan kuliah untuk mahasiswa Indonesia.

ATURAN WAJIB:
${
  adaSumberCatatan
    ? `- Kamu DIBERIKAN catatan kuliah asli mahasiswa di bawah. WAJIB membuat soal HANYA dari isi catatan tersebut.
- DILARANG KERAS menambahkan fakta, istilah, atau konsep yang TIDAK ADA di catatan.
- Kalau catatan tidak cukup untuk membuat sejumlah soal yang diminta, buat soal sebanyak yang bisa didukung catatan saja (boleh kurang dari jumlah diminta).`
    : `- Mahasiswa TIDAK punya catatan untuk mata kuliah ini. Buat soal dari pengetahuan umum akademik tingkat mahasiswa untuk topik mata kuliah tersebut.
- Soal harus tetap relevan & masuk akal untuk mata kuliah tingkat universitas, jangan terlalu spesifik ke silabus tertentu karena kamu tidak tahu materi dosen ini persis.`
}
- Campuran jenis soal: pilihan ganda, benar/salah, isian singkat, soal pemahaman/kasus sederhana -- proporsi disesuaikan jumlah soal.
- Setiap soal WAJIB punya field "topik" singkat (2-4 kata) buat pengelompokan.
- Setiap soal WAJIB punya "pembahasan" singkat kenapa jawabannya itu.
- Output HANYA JSON valid sesuai skema, TANPA teks lain di luar JSON, TANPA markdown code fence.

SKEMA JSON:
{
  "soal": [
    {
      "id": "string unik, misal q1",
      "tipe": "pilihan_ganda" | "benar_salah" | "isian_singkat",
      "topik": "string singkat",
      "pertanyaan": "string",
      "opsi": ["array string, HANYA untuk pilihan_ganda/benar_salah, kosongkan [] untuk isian_singkat"],
      "jawaban_benar": "string -- untuk pilihan_ganda/benar_salah harus SAMA PERSIS dengan salah satu isi opsi",
      "pembahasan": "string singkat"
    }
  ]
}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!GROQ_API_KEY) {
    return new Response(
      JSON.stringify({ error: "GROQ_API_KEY belum diset di server." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  try {
    const { mataKuliahNama, catatanText, mode, jumlahSoal } = await req.json();

    if (!mataKuliahNama || !mode) {
      return new Response(
        JSON.stringify({ error: "mataKuliahNama dan mode wajib diisi." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const adaSumberCatatan = Boolean(
      catatanText && catatanText.trim().length > 40,
    );
    const jumlah = jumlahSoal || JUMLAH_SOAL_DEFAULT[mode] || 5;

    const userPrompt = adaSumberCatatan
      ? `Mata kuliah: ${mataKuliahNama}\nJumlah soal diminta: ${jumlah}\n\nCatatan kuliah mahasiswa:\n"""\n${catatanText.slice(0, 12000)}\n"""`
      : `Mata kuliah: ${mataKuliahNama}\nJumlah soal diminta: ${jumlah}\n\n(Tidak ada catatan tersedia -- buat dari pengetahuan umum akademik.)`;

    const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          { role: "system", content: buildSystemPrompt(adaSumberCatatan) },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      return new Response(
        JSON.stringify({
          error: `Groq gagal (${response.status}). ${errText}`,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content;
    if (!raw) {
      return new Response(
        JSON.stringify({ error: "Groq tidak mengembalikan hasil." }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return new Response(
        JSON.stringify({ error: "Gagal parse hasil AI jadi JSON." }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!Array.isArray(parsed.soal) || parsed.soal.length === 0) {
      return new Response(
        JSON.stringify({ error: "AI tidak menghasilkan soal apapun." }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        sumber: adaSumberCatatan ? "catatan" : "umum",
        soal: parsed.soal,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Terjadi kesalahan: ${err.message || err}` }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
