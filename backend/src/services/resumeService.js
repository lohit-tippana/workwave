const ApiError = require('../utils/ApiError');

// Extracts plain text from a PDF or DOCX multer memory file.
async function extractText(file) {
  const mime = file.mimetype;
  if (mime === 'application/pdf') {
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(file.buffer);
    return clean(data.text);
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
    throw ApiError.badRequest('Could not extract enough text from the resume file.');
  }
  return out.slice(0, 20000);
}

module.exports = { extractText };
