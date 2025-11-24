import { Router } from 'express';
import {
  getBrandsByCategory,
  getCategories,
  getModelsByBrand,
  submitQuestionnaire,
  getConditionGroups
} from '../controllers/questionnaireController';
// import { getAddresses, createAddress, updateAddress, deleteAddress, setDefaultAddress } from '../controllers/profileController';
import { verifyToken } from '../middleware/authMiddleware';
import multer from 'multer';

// ---------- Multer Config (Same as in controller) ----------

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 10
  },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

const router = Router();

// === OTHER ROUTES ===
router.get('/categories', verifyToken, getCategories);
router.get('/brands/:categoryId', verifyToken, getBrandsByCategory);
router.get('/models/:categoryId/:brandId', verifyToken, getModelsByBrand);
router.get('/condition-groups/:categoryId', verifyToken, getConditionGroups);

// // Address routes
// router.get('/addresses/:userId', verifyToken, getAddresses);
// router.post('/addresses/:userId', verifyToken, createAddress);
// router.put('/addresses/:userId/:addressId', verifyToken, updateAddress);
// router.delete('/addresses/:userId/:addressId', verifyToken, deleteAddress);
// router.patch('/addresses/:userId/:addressId/default', verifyToken, setDefaultAddress);

// === SUBMIT ROUTE: Multer + Auth + Controller ===
router.post(
  '/questionnaire/submit',
  verifyToken,
  upload.array('photos', 10),  // ← MULTER HERE
  submitQuestionnaire          // ← Now req.body and req.files are ready
);

export default router;