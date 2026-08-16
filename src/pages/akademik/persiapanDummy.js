// src/pages/akademik/persiapanDummy.js
//
// FASE 1 ONLY. Data & generator dummy buat modul Persiapan Kuliah
// (AI Study Preparation). Belum manggil AI beneran -- ini murni biar
// UI/flow-nya bisa didemoin & dites sebelum Fase 4 (integrasi Groq).
//
// Di Fase 4 nanti, generateDummyStudyPack() ini yang bakal diganti
// jadi pemanggilan Edge Function (yang manggil Groq di server-side).
// Struktur objek yang di-return SENGAJA dibikin sama kayak yang bakal
// dikembalikan AI nanti, biar StudyPackDetailPage.jsx gak perlu
// diubah pas Fase 4 masuk -- cuma sumber datanya yang beda.

function makeId() {
  return `sp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Template konten -- disesuaikan dikit berdasarkan kedalaman, biar
// beda kerasa pas didemoin (bukan random, biar konsisten tiap kali).
export function generateDummyStudyPack({
  mataKuliah,
  topik,
  cakupan,
  kedalaman,
}) {
  const isRingkas = kedalaman === "ringkas";
  const isMendalam = kedalaman === "mendalam";

  return {
    id: makeId(),
    mataKuliah: mataKuliah || "Mata Kuliah",
    topik: topik || "Topik",
    cakupan: cakupan || "",
    kedalaman: kedalaman || "standar",
    createdAt: new Date().toISOString(),
    status: "selesai",

    objectives: [
      `Menjelaskan konsep dasar dari "${topik}" dengan bahasa sendiri.`,
      `Mengidentifikasi bagaimana "${topik}" berkaitan dengan materi ${mataKuliah} secara umum.`,
      ...(isMendalam
        ? [
            `Menganalisis studi kasus terkait "${topik}" dan menarik kesimpulan yang relevan.`,
          ]
        : []),
    ],

    materi: [
      {
        heading: `Pengantar ${topik}`,
        content: isRingkas
          ? `Ringkasan singkat: ${topik} adalah salah satu pokok bahasan dalam ${mataKuliah} yang berkaitan dengan ${cakupan || "cakupan yang sudah kamu tulis di form"}. Fokus ke poin-poin inti dulu, detailnya bisa dicek pas kelas.`
          : `${topik} merupakan salah satu pokok bahasan penting dalam ${mataKuliah}. Secara umum, materi ini membahas ${cakupan || "cakupan yang sudah kamu tulis di form"}, dan biasanya jadi dasar buat topik-topik lanjutan di pertemuan berikutnya.`,
      },
      {
        heading: "Konsep Utama",
        content:
          "Bagian ini menjelaskan konsep-konsep inti secara berurutan, mulai dari definisi dasar, komponen-komponen penyusun, sampai ke bagaimana konsep tersebut diterapkan dalam praktik. Setiap sub-poin sengaja dipecah biar gampang dicerna sebelum masuk kelas.",
      },
      ...(isMendalam
        ? [
            {
              heading: "Perspektif Tambahan",
              content:
                "Untuk pemahaman yang lebih matang, bagian ini membahas sudut pandang tambahan atau perdebatan yang relevan di topik ini, termasuk keterkaitannya dengan isu-isu terkini di bidang terkait.",
            },
          ]
        : []),
    ],

    keyConcepts: [
      { term: "Istilah Kunci #1", def: "Penjelasan singkat istilah kunci pertama yang relevan dengan topik ini." },
      { term: "Istilah Kunci #2", def: "Penjelasan singkat istilah kunci kedua, biasanya sering disebut dosen pas kelas." },
      { term: "Istilah Kunci #3", def: "Penjelasan singkat istilah kunci ketiga yang sering tertukar sama istilah lain." },
    ],

    contohKasus: [
      {
        title: "Contoh Penerapan",
        desc: `Ilustrasi bagaimana ${topik} diterapkan dalam situasi nyata, biar teorinya kerasa gak abstrak.`,
      },
    ],

    pertanyaanDosen: [
      `Menurut kamu, kenapa ${topik} penting dipelajari sebelum topik selanjutnya?`,
      "Apa hubungan antara konsep yang dibahas hari ini dengan pertemuan minggu lalu?",
      "Kalau ada satu hal yang kamu masih bingung dari materi ini, apa itu?",
    ],

    quickReview: `${topik} intinya soal ${cakupan || "cakupan yang kamu tulis"}. Sebelum masuk kelas, coba inget 3 istilah kunci di atas dan pastikan kamu bisa jelasin dengan kata-kata sendiri, bukan cuma hafalan.`,

    quiz: [
      {
        id: "q1",
        question: `Apa fokus utama dari topik "${topik}"?`,
        options: [
          "Sesuai dengan cakupan materi yang sudah ditentukan",
          "Topik yang tidak berkaitan dengan mata kuliah",
          "Hanya berlaku untuk ujian akhir semester",
          "Tidak memiliki penerapan praktis",
        ],
        correctIndex: 0,
        explanation:
          "Fokus utama topik ini mengikuti cakupan yang sudah ditulis di form persiapan.",
      },
      {
        id: "q2",
        question: "Manakah yang termasuk istilah kunci pada materi ini?",
        options: [
          "Istilah Kunci #2",
          "Istilah acak yang tidak dibahas",
          "Nama dosen pengampu",
          "Judul mata kuliah lain",
        ],
        correctIndex: 0,
        explanation: "Istilah Kunci #2 ada di bagian Key Concepts di atas.",
      },
      {
        id: "q3",
        question: "Tujuan Study Pack ini adalah untuk...",
        options: [
          "Menggantikan penjelasan dosen di kelas",
          "Membantu persiapan sebelum kelas dimulai",
          "Menjadi nilai resmi tugas",
          "Menghapus kebutuhan membaca RPS",
        ],
        correctIndex: 1,
        explanation:
          "Study Pack adalah bahan bantu persiapan, bukan pengganti materi resmi dosen.",
      },
    ],

    ujiPemahaman: [
      {
        id: "u1",
        question: `Coba jelaskan dengan kata-katamu sendiri, apa itu "${topik}"?`,
        feedback:
          "Jawaban kamu udah nyentuh poin pentingnya. Coba tambahin satu contoh konkret biar penjelasannya makin kuat.",
      },
      {
        id: "u2",
        question: `Menurut kamu, kenapa "${topik}" relevan dipelajari sekarang?`,
        feedback:
          "Bagus, alasannya masuk akal. Coba kaitkan juga sama materi minggu sebelumnya biar makin utuh.",
      },
      {
        id: "u3",
        question: "Apa satu hal dari materi ini yang paling gampang bikin salah paham?",
        feedback:
          "Ini poin yang sering kejebak mahasiswa lain juga. Pastikan kamu tanya ke dosen kalau masih ragu ya.",
      },
    ],

    disclaimer:
      "Study Pack ini dibuat AI sebagai bahan bantu persiapan, bukan pengganti materi resmi dari dosen. Selalu cek ulang dengan RPS/slide asli kalau ada.",
  };
}

// Dua contoh siap-pakai buat ngisi PersiapanPage pas belum ada
// riwayat beneran (Fase 1 belum nyimpen ke Supabase).
export const CONTOH_STUDY_PACKS = [
  generateDummyStudyPack({
    mataKuliah: "Pengantar Pariwisata Bahari",
    topik: "Ekowisata Bahari",
    cakupan: "Prinsip ekowisata, dampak terhadap ekosistem pesisir, dan studi kasus pengelolaan kawasan wisata bahari berkelanjutan.",
    kedalaman: "standar",
  }),
  generateDummyStudyPack({
    mataKuliah: "Manajemen Operasional",
    topik: "Perencanaan Kapasitas Produksi",
    cakupan: "Metode peramalan permintaan dan penyesuaian kapasitas produksi jangka pendek-menengah.",
    kedalaman: "ringkas",
  }),
];
