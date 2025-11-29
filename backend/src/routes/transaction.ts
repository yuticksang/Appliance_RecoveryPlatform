import { Router } from 'express';
import {
  getTransactionsBySeller,
  getAllTransactions,
  getTransactionById,
  createTransaction,
  updateTransactionStatus,
  updateTransaction,
  updateSubmissionDetails,
  updateCustomerInfo,
  uploadAdminPhotos,
  getConditionOptionsByGroupIds
} from '../controllers/transactionController';
import { verifyToken } from '../middleware/authMiddleware';
import multer from 'multer';

// Multer config for photo uploads
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

// All routes require authentication
router.use(verifyToken);

// Get transactions for a specific seller
router.get('/seller/:sellerId', getTransactionsBySeller);

// Get all transactions (admin)
router.get('/', getAllTransactions);

// Get condition options by group IDs
router.get('/condition-options-by-groups', verifyToken, getConditionOptionsByGroupIds);

// Get single transaction by ID
router.get('/:id', getTransactionById);

// Create new transaction
router.post('/', createTransaction);

// Update transaction status
router.put('/:id/status', updateTransactionStatus);
  
// Upload admin photos to Supabase Storage
router.post('/:id/photos', upload.array('photos', 10), uploadAdminPhotos);

// Update customer information (seller edit when Awaiting Pick Up)
router.put('/:id/customer-info', updateCustomerInfo);

// Update submission details (seller edit when Awaiting Pick Up)
router.put('/:id/submission', updateSubmissionDetails);


// Update transaction (full edit - admin)
router.put('/:id', updateTransaction);


export default router;
