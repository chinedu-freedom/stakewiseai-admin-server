import multer from "multer";

// Use memory storage to get file buffer directly
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter(req, file, cb) {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Only JPEG, PNG, and WEBP images are allowed"), false);
    }

    cb(null, true);
  },
});

// Helper to extract buffer and originalname safely
export const getFileData = (req, fieldName = "image") => {
  if (!req.file) return null;

  return {
    buffer: req.file.buffer,          // Multer memory buffer
    originalname: req.file.originalname, // Original file name
    mimetype: req.file.mimetype,      // MIME type
  };
};
