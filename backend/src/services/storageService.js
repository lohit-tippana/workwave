const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const config = require('../config');
const ApiError = require('../utils/ApiError');

let cloudinary = null;
if (config.isCloudinaryConfigured()) {
  cloudinary = require('cloudinary').v2;
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
  });
}

function uploadToCloudinary(buffer, { folder, resourceType = 'auto', filename }) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `workwave/${folder}`, resource_type: resourceType, public_id: filename },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

async function saveLocally(buffer, { folder, ext }) {
  const dir = path.join(config.uploadDir, folder);
  fs.mkdirSync(dir, { recursive: true });
  const name = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
  fs.writeFileSync(path.join(dir, name), buffer);
  return { url: `/uploads/${folder}/${name}`, publicId: `${folder}/${name}` };
}

/**
 * Upload a multer memory file. Returns { url, publicId, name, provider }.
 * Uses Cloudinary when configured; otherwise stores under backend/uploads
 * which is served statically by Express. The provider is recorded so callers
 * can distinguish storage backends.
 */
async function uploadFile(file, { folder = 'misc', resourceType = 'auto' } = {}) {
  if (!file) throw ApiError.badRequest('No file provided');
  const ext = path.extname(file.originalname || '') || '';
  const base = path.basename(file.originalname || 'file', ext).replace(/[^\w-]/g, '_').slice(0, 60);

  try {
    if (cloudinary) {
      const result = await uploadToCloudinary(file.buffer, {
        folder,
        resourceType,
        filename: `${Date.now()}-${base}`,
      });
      return { url: result.secure_url, publicId: result.public_id, name: file.originalname, provider: 'cloudinary' };
    }
    const saved = await saveLocally(file.buffer, { folder, ext });
    return { ...saved, name: file.originalname, provider: 'local' };
  } catch (err) {
    console.error('[storage] upload failed:', err.message);
    throw ApiError.serviceUnavailable('File upload failed. Please try again.');
  }
}

async function deleteFile(publicId, { resourceType = 'auto' } = {}) {
  if (!publicId) return;
  try {
    if (cloudinary && !publicId.startsWith('misc/') && !publicId.includes('/')) return;
    if (cloudinary) {
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    } else {
      const filePath = path.join(config.uploadDir, publicId);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error('[storage] delete failed:', err.message);
  }
}

module.exports = { uploadFile, deleteFile, isCloudinary: () => Boolean(cloudinary) };
