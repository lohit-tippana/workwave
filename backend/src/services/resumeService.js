const path = require('path');
const ApiError = require('../utils/ApiError');

// Extracts plain text from a PDF or DOCX multer memory file.
// PDFs are parsed with pdfjs-dist (maintained pdf.js) — pdf-parse@1.x ships a
// pdf.js build from 2019 that fails on modern Node with
// "FormatError: bad XRef entry" / "Invalid number: (charCode 0)".

let pdfjsPromise = null;
function getPdfjs() {
  if (!pdfjsPromise) pdfjsPromise = import('pdfjs-dist/legacy/build/pdf.mjs');
  return pdfjsPromise;
}

async function extractPdfText(buffer) {
  if (buffer.length === 0) {
    throw ApiError.badRequest('The uploaded file is empty.');
  }
  // A real PDF starts with the %PDF- magic header — cheap guard that gives a
  // clear error for renamed docs/HTML/other binary junk before invoking pdf.js.
  if (!buffer.subarray(0, 5).toString('latin1').startsWith('%PDF-')) {
    throw ApiError.badRequest('The file does not appear to be a valid PDF.');
  }
  const pdfjs = await getPdfjs();
  let doc;
  try {
    doc = await pdfjs.getDocument({
      data: new Uint8Array(buffer),
      standardFontDataUrl: path.join(path.dirname(require.resolve('pdfjs-dist/package.json')), 'standard_fonts') + path.sep,
      isEvalSupported: false,
    }).promise;
  } catch (err) {
    if (err?.name === 'PasswordException' || /password/i.test(err?.message || '')) {
      throw ApiError.badRequest('This PDF is password-protected. Please upload an unprotected copy.');
    }
    throw ApiError.badRequest('Could not read this PDF — it may be corrupted or use an unsupported format.');
  }
  try {
    const parts = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      parts.push(content.items.map((it) => it.str).join(' '));
    }
    return parts.join('\n');
  } finally {
    await doc.destroy().catch(() => {});
  }
}

async function extractText(file) {
  const mime = file.mimetype;
  if (mime === 'application/pdf') {
    return clean(await extractPdfText(file.buffer));
  }
  if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const mammoth = require('mammoth');
    const { value } = await mammoth.extractRawText({ buffer: file.buffer });
    return clean(value);
  }
  throw ApiError.badRequest('Unsupported resume format. Upload a PDF or DOCX file.');
}

function clean(text) {
  const out = String(text || '').replace(/\s+/g, ' ').trim();
  if (out.length < 50) {
    throw ApiError.badRequest('Could not extract enough text from the resume file. If this is a scanned/image-only PDF, text extraction is not possible.');
  }
  return out.slice(0, 20000);
}

module.exports = { extractText };
