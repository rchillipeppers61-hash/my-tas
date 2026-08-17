// src/pages/catatan/docxImport.jsx
//
// Ekstrak teks dari file Word (.docx) yang di-import user, buat dijadiin
// draft catatan (sama seperti PDF -> teks di pdfImport.jsx).
//
// Pakai "mammoth" -- cuma bisa baca format .docx (zip-based, Word 2007+).
// Format .doc lama (binary, Word 97-2003) GAK didukung; kalau ada yang upload
// .doc lama, kasih pesan error yang jelas biar gak bingung.
//
// Install dulu: npm install mammoth

import mammoth from "mammoth";

// Di bawah ini dianggap "kosong" -> kemungkinan file rusak/format gak didukung.
const MIN_MEANINGFUL_CHARS = 20;

/**
 * Ekstrak teks polos dari file .docx.
 * @param {File} file - file .docx dari <input type="file">
 * @returns {Promise<string>} teks hasil ekstraksi
 */
export async function extractDocxText(file) {
  const isDocx =
    file.name?.toLowerCase().endsWith(".docx") ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  if (!isDocx) {
    throw new Error(
      "Cuma file Word format .docx yang didukung (Word 2007 ke atas). Kalau file-nya .doc lama, coba save-as ulang jadi .docx dulu.",
    );
  }

  let result;
  try {
    const arrayBuffer = await file.arrayBuffer();
    result = await mammoth.extractRawText({ arrayBuffer });
  } catch (err) {
    throw new Error("Gagal membuka file Word. Pastikan file-nya tidak rusak.");
  }

  const text = (result?.value ?? "").trim();

  if (text.replace(/\s/g, "").length < MIN_MEANINGFUL_CHARS) {
    throw new Error(
      "Gak ada teks yang kebaca dari file Word ini. Pastikan file-nya berisi teks, bukan cuma gambar/scan.",
    );
  }

  return text;
}
