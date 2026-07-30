const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const imageFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp|gif/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = file.mimetype.startsWith('image/');
  if (ext && mime) cb(null, true);
  else cb(new Error('Only image files are allowed (JPG, PNG, WEBP)'), false);
};

const docFilter = (req, file, cb) => {
  const allowedExt = /jpeg|jpg|png|gif|pdf|doc|docx|webp/;
  const ext = allowedExt.test(path.extname(file.originalname).toLowerCase());
  const mime =
    file.mimetype.startsWith('image/') ||
    file.mimetype.includes('pdf') ||
    file.mimetype.includes('document') ||
    file.mimetype.includes('msword');
  if (ext || mime) cb(null, true);
  else cb(new Error('Only images and documents are allowed'), false);
};

// Profile photo — max 50 KB
const uploadAvatar = multer({
  storage,
  limits: { fileSize: 50 * 1024 },
  fileFilter: imageFilter,
});

// Documents — max 100 KB
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 },
  fileFilter: docFilter,
});

module.exports = upload;
module.exports.uploadAvatar = uploadAvatar;
module.exports.upload = upload;
