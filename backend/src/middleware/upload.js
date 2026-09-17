const multer = require('multer');
const config = require('../config');
const ApiError = require('../utils/ApiError');

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const DOC_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

// Files are kept in memory and handed to the storage service
// (Cloudinary when configured, local disk otherwise).
const storage = multer.memoryStorage();

const makeUpload = (allowedTypes, maxMb = config.maxFileSizeMb) =>
  multer({
    storage,
    limits: { fileSize: maxMb * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (allowedTypes && !allowedTypes.includes(file.mimetype)) {
        return cb(ApiError.badRequest(`Unsupported file type: ${file.mimetype}`));
      }
      cb(null, true);
    },
  });

module.exports = {
  uploadImage: makeUpload(IMAGE_TYPES),
  uploadDocument: makeUpload(DOC_TYPES, 8),
  uploadAny: makeUpload([...IMAGE_TYPES, ...DOC_TYPES], 8),
  IMAGE_TYPES,
  DOC_TYPES,
};
