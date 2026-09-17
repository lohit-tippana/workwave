// Generates a minimal valid .docx and verifies mammoth extraction (test utility).
const AdmZip = require('adm-zip');
const zip = new AdmZip();
zip.addFile('[Content_Types].xml', Buffer.from(
  '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'
));
zip.addFile('_rels/.rels', Buffer.from(
  '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'
));
zip.addFile('word/document.xml', Buffer.from(
  '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' +
  '<w:p><w:r><w:t>Priya Sharma - Full Stack Developer with React Node.js MongoDB and Express experience building SaaS products for five years</w:t></w:r></w:p>' +
  '</w:body></w:document>'
));
zip.writeZip(require('path').join(__dirname, '..', 'test-resume.docx'));
console.log('docx written');

require('../src/config');
const resumeService = require('../src/services/resumeService');
resumeService.extractText({
  mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  buffer: require('fs').readFileSync(require('path').join(__dirname, '..', 'test-resume.docx')),
}).then((t) => console.log('DOCX OK:', t.slice(0, 140))).catch((e) => console.log('DOCX FAIL:', e.message));
