// src/pages/catatan/pdfImport.jsx
//
// Ekstrak teks dari file PDF yang di-import user (bukan buat generate PDF --
// itu tugas pdfExport.jsx yang udah ada, ini kebalikannya: PDF -> teks).
//
// Cuma bisa baca PDF yang isinya teks asli (misal slide dosen, PDF hasil
// export dari Word/PowerPoint). PDF hasil SCAN gambar (foto halaman yang
// dijadiin PDF tanpa OCR) gak akan kebaca -- untuk kasus itu, arahkan user
// pakai fitur "foto catatan" (vision OCR) di ImportWidget.jsx.
//
// Install dulu: npm install pdfjs-dist

import * as pdfjsLib from "pdfjs-dist";

// Worker di-load dari CDN, jadi gak gantung nama file worker lokal yang
// beda-beda tergantung versi pdfjs-dist yang ke-install (ada yang
// "pdf.worker.min.mjs", ada yang "pdf.worker.mjs"). Kalau mau self-host
// (misal buat offline-first), ganti baris ini sesuai path worker versi
// pdfjs-dist yang lo pakai -- cek folder node_modules/pdfjs-dist/build/.
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

// Di bawah ini dianggap "kosong/scan" -> kasih pesan error yang ngarahin ke
// fitur foto, daripada ngirim teks sampah ke LLM.
const MIN_MEANINGFUL_CHARS = 20;

/**
 * Ekstrak semua teks dari file PDF, halaman demi halaman.
 * @param {File} file - file PDF dari <input type="file">
 * @returns {Promise<string>} teks gabungan semua halaman
 */
export async function extractPdfText(file) {
  let pdf;
  try {
    const arrayBuffer = await file.arrayBuffer();
    pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  } catch (err) {
    throw new Error("Gagal membuka file PDF. Pastikan file-nya tidak rusak.");
  }

  const pageTexts = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => item.str)
      .join(" ")
      .trim();
    if (pageText) pageTexts.push(pageText);
  }

  const fullText = pageTexts.join("\n\n").trim();

  if (fullText.replace(/\s/g, "").length < MIN_MEANINGFUL_CHARS) {
    throw new Error(
      "PDF ini kelihatannya hasil scan/gambar (gak ada teks yang bisa dibaca). Coba pakai fitur 'Foto catatan' aja buat halaman ini.",
    );
  }

  return fullText;
}
