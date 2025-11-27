import multer from 'multer';
import { Request, Response, NextFunction } from 'express';

// Configure multer storage - use memoryStorage to keep files in buffer for Supabase upload
const storage = multer.memoryStorage();

// File filter - only allow images (when a file is provided)
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  if (file && allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else if (file) {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'));
  } else {
    // No file provided, which is okay
    cb(null, false);
  }
};

// Create multer instance
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  }
});

// Optional upload middleware - doesn't fail if no file is provided
export const optionalUpload = (req: Request, res: Response, next: NextFunction) => {
  const uploadSingle = upload.single('image');
  uploadSingle(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading
      console.error('Multer error:', err);
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    } else if (err) {
      // An unknown error occurred
      console.error('Upload error:', err);
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    }
    // Everything went fine, continue
    next();
  });
};
