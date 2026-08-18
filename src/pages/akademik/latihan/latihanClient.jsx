// src/pages/akademik/latihan/latihanClient.js
//
// Manggil Supabase Edge Function "generate-latihan". API key Groq
// TIDAK ada di sini/di browser sama sekali -- itu disimpan sebagai
// secret di server edge function. Beda sama groqClient.jsx punya
// fitur Catatan Kuliah yang manggil Groq langsung dari client.

import { supabase } from "../../../supabaseClient";

export class LatihanError extends Error {
  constructor(message) {
    super(message);
    this.name = "LatihanError";
  }
}

/**
 * @param {object} params
 * @param {string} params.mataKuliahNama
 * @param {string} [params.catatanText] - gabungan isi catatan, kosongkan kalau gak ada
 * @param {"quick"|"study"|"exam"} params.mode
 * @param {number} [params.jumlahSoal] - override default per mode
 * @returns {Promise<{ sumber: "catatan"|"umum", soal: Array }>}
 */
export async function generateLatihan({
  mataKuliahNama,
  catatanText,
  mode,
  jumlahSoal,
}) {
  const { data, error } = await supabase.functions.invoke("generate-latihan", {
    body: { mataKuliahNama, catatanText, mode, jumlahSoal },
  });

  if (error) {
    throw new LatihanError(
      "Gagal membuat soal latihan. Coba lagi sebentar lagi.",
    );
  }
  if (data?.error) {
    throw new LatihanError(data.error);
  }
  if (!data?.soal?.length) {
    throw new LatihanError("AI tidak menghasilkan soal. Coba lagi.");
  }

  return data;
}
