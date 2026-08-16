// supabase/functions/generate-study-pack/index.ts
//
// Terima { mataKuliah, topik, cakupan, kedalaman } dari frontend,
// panggil Groq server-side (key aman di secrets), balikin JSON
// dengan struktur yang SAMA PERSIS kayak generateDummyStudyPack()
// di persiapanDummy.js -- biar StudyPackDetailPage.jsx gak perlu diubah.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const GROQ_MODEL = "llama-3.3-70b-versatile"; // sesuaikan kalau beda dari Catatan Siswa

// Service role key bypass RLS -- dipakai di sini karena app pakai
// custom auth (bukan Supabase Auth), jadi gak ada JWT user yang bisa
// diverifikasi Supabase secara native. Kita percaya userId yang
// dikirim dari frontend (sama seperti pola query mata_kuliah yang
// sudah ada, yang juga filter by user_id di level app, bukan RLS).
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Jumlah soal quiz, sub-materi, & pertanyaan Uji Pemahaman disesuaikan
// kedalaman. ujiPemahamanCount ditambahin karena sebelumnya gak ada
// target eksplisit di prompt -- AI jadi suka asal nentuin sendiri
// (pernah cuma bikin 1 pertanyaan buat kedalaman "mendalam").
const KEDALAMAN_CONFIG = {
  ringkas: { quizCount: 5, materiSections: 2, ujiPemahamanCount: 2 },
  standar: { quizCount: 7, materiSections: 3, ujiPemahamanCount: 3 },
  mendalam: { quizCount: 10, materiSections: 4, ujiPemahamanCount: 4 },
};

function buildSystemPrompt() {
  return `Kamu adalah asisten belajar (study assistant) untuk mahasiswa, BUKAN pengganti dosen.

ATURAN PENTING:
- Jangan mengarang fakta, nama teori, tokoh, tanggal, atau angka statistik yang tidak lazim/tidak yakin kebenarannya.
- Kalau ragu soal detail spesifik, gunakan konsep umum yang sudah mapan (well-established), jangan spekulasi.
- Prioritaskan penjelasan konseptual (definisi, alur logika, cara berpikir) dibanding klaim faktual yang sulit diverifikasi.
- Bahasa Indonesia, jelas, terstruktur, ramah untuk mahasiswa.
- Output HARUS berupa JSON valid yang PERSIS mengikuti schema yang diberikan di user prompt. Jangan tambah field lain, jangan beri teks di luar JSON.`;
}

function buildUserPrompt({ mataKuliah, topik, cakupan, kedalaman }) {
  const cfg = KEDALAMAN_CONFIG[kedalaman] || KEDALAMAN_CONFIG.standar;

  return `Buatkan Study Pack untuk persiapan kuliah dengan detail berikut:

Mata Kuliah: ${mataKuliah}
Topik/Materi: ${topik}
Cakupan (dari mahasiswa, opsional): ${cakupan || "(tidak diisi, gunakan pengetahuan umum tentang topik ini)"}
Kedalaman: ${kedalaman} (buat ${cfg.materiSections} bagian materi, ${cfg.quizCount} soal quiz, ${cfg.ujiPemahamanCount} pertanyaan uji pemahaman)

Kembalikan JSON PERSIS dengan struktur ini (isi semua field, jangan kosong):

{
  "objectives": ["string", ...],
  "materi": [{ "heading": "string", "content": "string" }, ...],
  "keyConcepts": [{ "term": "string", "def": "string" }, ...],
  "contohKasus": [{ "title": "string", "desc": "string" }, ...],
  "pertanyaanDosen": ["string", ...],
  "quickReview": "string",
  "quiz": [
    { "id": "q1", "question": "string", "options": ["string","string","string","string"], "correctIndex": 0, "explanation": "string" }
  ],
  "ujiPemahaman": [
    { "id": "u1", "question": "string", "feedback": "string (feedback contoh/panduan, karena jawaban user belum ada)" }
  ]
}

Buat tepat ${cfg.quizCount} soal di "quiz". "correctIndex" HARUS berupa angka 0-3 yang valid sesuai jumlah "options" (selalu 4 opsi per soal).
Buat tepat ${cfg.ujiPemahamanCount} pertanyaan di "ujiPemahaman" (id berurutan: u1, u2, dst), masing-masing pertanyaan terbuka yang beda sudut pandang (bukan cuma variasi kalimat dari pertanyaan yang sama), supaya mahasiswa latihan jelasin materi dengan kata-kata sendiri dari berbagai sisi.`;
}

async function callGroq(mataKuliah, topik, cakupan, kedalaman) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.4, // rendah -- biar gak terlalu "kreatif"/ngarang
      response_format: { type: "json_object" }, // paksa output JSON valid
      messages: [
        { role: "system", content: buildSystemPrompt() },
        {
          role: "user",
          content: buildUserPrompt({ mataKuliah, topik, cakupan, kedalaman }),
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API error: ${res.status} ${errText}`);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error("Groq response kosong");

  return JSON.parse(raw);
}

// Validasi minimal biar gak crash di frontend kalau AI skip field.
function validateStudyPack(sp) {
  const requiredArrayFields = [
    "objectives",
    "materi",
    "keyConcepts",
    "contohKasus",
    "pertanyaanDosen",
    "quiz",
    "ujiPemahaman",
  ];
  for (const f of requiredArrayFields) {
    if (!Array.isArray(sp[f]) || sp[f].length === 0) {
      throw new Error(`Field "${f}" hilang atau kosong dari hasil AI`);
    }
  }
  if (typeof sp.quickReview !== "string" || !sp.quickReview.trim()) {
    throw new Error('Field "quickReview" hilang dari hasil AI');
  }
  // Validasi correctIndex tiap soal quiz masih dalam range options.
  for (const q of sp.quiz) {
    if (
      typeof q.correctIndex !== "number" ||
      q.correctIndex < 0 ||
      q.correctIndex >= (q.options?.length || 0)
    ) {
      throw new Error(`correctIndex tidak valid pada soal: ${q.question}`);
    }
  }
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mataKuliah, topik, cakupan, kedalaman, userId } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: "userId wajib dikirim" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!mataKuliah || !topik) {
      return new Response(
        JSON.stringify({ error: "mataKuliah dan topik wajib diisi" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Validasi ringan: pastikan userId beneran ada di tabel users lo.
    // Ini BUKAN verifikasi identitas kriptografis (karena gak ada token
    // auth), cuma jaring pengaman biar gak nyimpen data ke user_id acak.
    const { data: userRow, error: userCheckError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("id", userId)
      .single();

    if (userCheckError || !userRow) {
      return new Response(JSON.stringify({ error: "User tidak ditemukan" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await callGroq(mataKuliah, topik, cakupan, kedalaman);
    validateStudyPack(aiResult);

    const studyPack = {
      mataKuliah,
      topik,
      cakupan: cakupan || "",
      kedalaman: kedalaman || "standar",
      ...aiResult,
      disclaimer:
        "Study Pack ini dibuat AI sebagai bahan bantu persiapan, bukan pengganti materi resmi dari dosen. Selalu cek ulang dengan RPS/slide asli kalau ada.",
    };

    // Simpen ke Supabase pakai service role (bypass RLS).
    const { data: saved, error: insertError } = await supabaseAdmin
      .from("study_packs")
      .insert({
        user_id: userId,
        mata_kuliah: studyPack.mataKuliah,
        topik: studyPack.topik,
        cakupan: studyPack.cakupan,
        kedalaman: studyPack.kedalaman,
        objectives: studyPack.objectives,
        materi: studyPack.materi,
        key_concepts: studyPack.keyConcepts,
        contoh_kasus: studyPack.contohKasus,
        pertanyaan_dosen: studyPack.pertanyaanDosen,
        quick_review: studyPack.quickReview,
        quiz: studyPack.quiz,
        uji_pemahaman: studyPack.ujiPemahaman,
        disclaimer: studyPack.disclaimer,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Convert balik snake_case (kolom DB) -> camelCase (yang dipake
    // StudyPackDetailPage.jsx), biar UI gak perlu diubah sama sekali.
    const responseStudyPack = {
      id: saved.id,
      mataKuliah: saved.mata_kuliah,
      topik: saved.topik,
      cakupan: saved.cakupan,
      kedalaman: saved.kedalaman,
      createdAt: saved.created_at,
      status: "selesai",
      objectives: saved.objectives,
      materi: saved.materi,
      keyConcepts: saved.key_concepts,
      contohKasus: saved.contoh_kasus,
      pertanyaanDosen: saved.pertanyaan_dosen,
      quickReview: saved.quick_review,
      quiz: saved.quiz,
      ujiPemahaman: saved.uji_pemahaman,
      disclaimer: saved.disclaimer,
    };

    return new Response(JSON.stringify({ studyPack: responseStudyPack }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-study-pack error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Gagal generate Study Pack" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
