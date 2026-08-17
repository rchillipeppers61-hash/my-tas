// src/pages/catatan/pdfExport.jsx
//
// Semua yang berhubungan sama "markdown catatan -> output lain" digabung di
// sini: parsing markdown, export PDF (single & gabungan). Digabung karena
// isinya emang saling terkait erat dan masing-masing potongan kecil,
// daripada dipecah ke banyak file kecil.
//
// - parseMarkdown()       -> ubah teks markdown jadi array block terstruktur
// - renderInline()        -> render inline **bold** jadi JSX (dipakai kalau
//                             suatu saat butuh nampilin markdown ter-render di UI)
// - stripMarkdownSyntax() -> buang syntax markdown, dipakai buat preview teks
//                             singkat di list card & modal export
// - exportCatatanPdf()    -> 1 catatan = 1 PDF
// - exportAllCatatanPdf() -> gabungan beberapa catatan jadi 1 PDF, tiap
//                             catatan tetap dikasih label tanggal sendiri
//
// Install dulu: npm install jspdf

import { jsPDF } from "jspdf";

// ============================================================
// Markdown parsing
// ============================================================

export function parseMarkdown(text) {
  if (!text) return [];
  const lines = text.split("\n");
  const blocks = [];
  let bulletBuffer = [];

  function flushBullets() {
    if (bulletBuffer.length) {
      blocks.push({ type: "ul", items: bulletBuffer });
      bulletBuffer = [];
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (!line.trim()) {
      flushBullets();
      continue;
    }

    const h2Match = line.match(/^##\s+(.*)/);
    const h1Match = line.match(/^#\s+(.*)/);
    const bulletMatch = line.match(/^[-*]\s+(.*)/);

    if (h2Match) {
      flushBullets();
      blocks.push({ type: "h2", text: h2Match[1] });
    } else if (h1Match) {
      flushBullets();
      blocks.push({ type: "h1", text: h1Match[1] });
    } else if (bulletMatch) {
      bulletBuffer.push(bulletMatch[1]);
    } else {
      flushBullets();
      blocks.push({ type: "p", text: line.trim() });
    }
  }
  flushBullets();

  return blocks;
}

// Render inline **bold** jadi <strong>, sisanya teks biasa.
export function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, i) => {
    const boldMatch = part.match(/^\*\*([^*]+)\*\*$/);
    if (boldMatch) return <strong key={i}>{boldMatch[1]}</strong>;
    return <span key={i}>{part}</span>;
  });
}

// Versi plain-text: buang semua syntax markdown, dipakai buat preview singkat
// di list card & modal export (biar gak keliatan "##" / "**" mentah).
export function stripMarkdownSyntax(text) {
  if (!text) return "";
  return text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/^[-*]\s+/gm, "• ")
    .trim();
}

// ============================================================
// PDF export
// ============================================================

const PAGE_MARGIN = 18; // mm
const LINE_HEIGHT = 6; // mm, dipakai buat paragraf/bullet ukuran normal

// Pecah satu baris teks jadi list kata + flag bold, dari syntax **bold**.
function tokenize(text) {
  const segments = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  const words = [];
  segments.forEach((seg) => {
    const boldMatch = seg.match(/^\*\*([^*]+)\*\*$/);
    const bold = !!boldMatch;
    const content = boldMatch ? boldMatch[1] : seg;
    content
      .split(/\s+/)
      .filter(Boolean)
      .forEach((w) => words.push({ text: w, bold }));
  });
  return words;
}

// Nulis teks kaya (mixed bold/normal) dengan word-wrap manual + page-break
// otomatis. Return posisi Y terakhir setelah nulis.
function drawRichText(doc, text, ctx) {
  const { x, maxWidth, fontSize, pageHeight } = ctx;
  let { y } = ctx;

  doc.setFontSize(fontSize);
  const words = tokenize(text);
  const spaceWidth = doc.getTextWidth(" ");
  let cursorX = x;

  words.forEach((w) => {
    doc.setFont("helvetica", w.bold ? "bold" : "normal");
    const wordWidth = doc.getTextWidth(w.text);

    if (cursorX + wordWidth > x + maxWidth && cursorX !== x) {
      cursorX = x;
      y += LINE_HEIGHT;
    }
    if (y > pageHeight - PAGE_MARGIN) {
      doc.addPage();
      y = PAGE_MARGIN;
    }

    doc.text(w.text, cursorX, y);
    cursorX += wordWidth + spaceWidth;
  });

  return y + LINE_HEIGHT;
}

function ensureSpace(doc, y, needed, pageHeight) {
  if (y + needed > pageHeight - PAGE_MARGIN) {
    doc.addPage();
    return PAGE_MARGIN;
  }
  return y;
}

// Render array blocks hasil parseMarkdown() mulai dari posisi y tertentu.
// Dipakai bareng oleh exportCatatanPdf() & exportAllCatatanPdf().
function drawBlocks(doc, blocks, ctx) {
  const { x, maxWidth, pageHeight } = ctx;
  let y = ctx.y;

  blocks.forEach((block) => {
    if (block.type === "h1") {
      y = ensureSpace(doc, y, 10, pageHeight);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13.5);
      doc.setTextColor(30, 30, 35);
      y = drawRichText(doc, block.text, {
        x,
        y,
        maxWidth,
        fontSize: 13.5,
        pageHeight,
      });
      y += 1.5;
    } else if (block.type === "h2") {
      y = ensureSpace(doc, y, 9, pageHeight);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(109, 40, 217);
      y = drawRichText(doc, block.text.toUpperCase(), {
        x,
        y,
        maxWidth,
        fontSize: 11,
        pageHeight,
      });
      doc.setTextColor(30, 30, 35);
      y += 1;
    } else if (block.type === "ul") {
      block.items.forEach((item) => {
        y = ensureSpace(doc, y, LINE_HEIGHT, pageHeight);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10.5);
        doc.text("•", x, y);
        y = drawRichText(doc, item, {
          x: x + 5,
          y,
          maxWidth: maxWidth - 5,
          fontSize: 10.5,
          pageHeight,
        });
      });
      y += 1;
    } else {
      y = ensureSpace(doc, y, LINE_HEIGHT, pageHeight);
      y = drawRichText(doc, block.text, {
        x,
        y,
        maxWidth,
        fontSize: 10.5,
        pageHeight,
      });
      y += 1;
    }
  });

  return y;
}

function makeDoc() {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - PAGE_MARGIN * 2;
  return { doc, pageWidth, pageHeight, maxWidth };
}

function safeFileName(name) {
  return (name || "catatan")
    .replace(/[\\/:*?"<>|]/g, "")
    .trim()
    .slice(0, 60);
}

/**
 * Generate & langsung download PDF dari 1 catatan.
 * @param {object} params
 * @param {string} params.judul - nama mata kuliah / judul dokumen
 * @param {string} [params.subjudul] - nama dosen, opsional
 * @param {string} [params.tanggal] - string tanggal udah diformat
 * @param {string} params.isi - teks markdown catatan
 */
export function exportCatatanPdf({ judul, subjudul, tanggal, isi }) {
  const { doc, pageWidth, pageHeight, maxWidth } = makeDoc();
  let y = PAGE_MARGIN;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  const titleLines = doc.splitTextToSize(judul || "Catatan Kuliah", maxWidth);
  doc.text(titleLines, PAGE_MARGIN, y);
  y += titleLines.length * 7 + 1;

  if (subjudul) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(90, 90, 100);
    doc.text(subjudul, PAGE_MARGIN, y);
    y += 5.5;
  }

  if (tanggal) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(130, 130, 140);
    doc.text(tanggal, PAGE_MARGIN, y);
    y += 6;
  }

  doc.setDrawColor(220, 215, 235);
  doc.line(PAGE_MARGIN, y, pageWidth - PAGE_MARGIN, y);
  y += 8;

  doc.setTextColor(30, 30, 35);

  const blocks = parseMarkdown(isi);
  drawBlocks(doc, blocks, { x: PAGE_MARGIN, maxWidth, pageHeight, y });

  doc.save(`${safeFileName(judul)}.pdf`);
}

/**
 * Generate & langsung download 1 PDF berisi SEMUA catatan yang dipilih.
 * Tiap catatan dikasih label tanggal sendiri (warna ungu) di atas isinya,
 * jadi kronologi tetap kebaca meski udah digabung.
 *
 * @param {object} params
 * @param {string} params.matkulNama - nama mata kuliah
 * @param {string} [params.dosen] - nama dosen, opsional
 * @param {{ tanggal: string, isi: string }[]} params.catatanList
 *        - urutan array = urutan tampil di PDF (biasanya kronologis lama->baru)
 */
export function exportAllCatatanPdf({ matkulNama, dosen, catatanList }) {
  const { doc, pageWidth, pageHeight, maxWidth } = makeDoc();
  let y = PAGE_MARGIN;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  const titleLines = doc.splitTextToSize(
    `Semua Catatan - ${matkulNama || "Mata Kuliah"}`,
    maxWidth,
  );
  doc.text(titleLines, PAGE_MARGIN, y);
  y += titleLines.length * 7 + 1;

  if (dosen) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(90, 90, 100);
    doc.text(dosen, PAGE_MARGIN, y);
    y += 5.5;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(130, 130, 140);
  doc.text(`${catatanList.length} catatan`, PAGE_MARGIN, y);
  y += 6;

  doc.setDrawColor(220, 215, 235);
  doc.line(PAGE_MARGIN, y, pageWidth - PAGE_MARGIN, y);
  y += 9;

  doc.setTextColor(30, 30, 35);

  catatanList.forEach((catatan, idx) => {
    if (idx > 0) {
      y = ensureSpace(doc, y, 14, pageHeight);
      doc.setDrawColor(230, 230, 235);
      doc.line(PAGE_MARGIN, y, pageWidth - PAGE_MARGIN, y);
      y += 8;
    }

    y = ensureSpace(doc, y, 8, pageHeight);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(109, 40, 217);
    doc.text(catatan.tanggal || "", PAGE_MARGIN, y);
    doc.setTextColor(30, 30, 35);
    y += 6.5;

    const blocks = parseMarkdown(catatan.isi);
    y = drawBlocks(doc, blocks, { x: PAGE_MARGIN, maxWidth, pageHeight, y });
  });

  doc.save(`Semua Catatan - ${safeFileName(matkulNama)}.pdf`);
}
