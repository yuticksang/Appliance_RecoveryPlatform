import { Router } from 'express';
import pool from '../config/database'
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
  getConditionOptionsByGroupIds,
  deleteTransaction,
  getTransactionsByBuyer,
  triggerSystemCancellation
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

// ⚠️ TEMPORARY DEBUG ROUTE - Add before router.use(verifyToken)
router.get('/debug/buyer/:buyerId', async (req, res) => {
  try {
    const { buyerId } = req.params;
    console.log('🧪 DEBUG: Checking data for buyer:', buyerId);

    // Check Transaction table for this buyer
    const transactionCheck = await pool.query(
      `SELECT 
        COUNT(*) as total_transactions,
        COUNT(CASE WHEN "transactionStatus" = 'Completed' THEN 1 END) as completed_transactions,
        STRING_AGG(DISTINCT "transactionStatus", ', ') as all_statuses
       FROM "Transaction" WHERE "buyerID" = $1`,
      [buyerId]
    );

    // Check SubmittedAppliance table linked to these transactions
    const applianceCheck = await pool.query(
      `SELECT 
        COUNT(*) as total_appliances,
        COUNT(CASE WHEN sa."finalOfferPrice" IS NOT NULL THEN 1 END) as with_final_price,
        AVG(sa."finalOfferPrice") as avg_final_price
       FROM "Transaction" t
       INNER JOIN "SubmittedAppliance" sa ON t."submittedApplianceID" = sa."submittedApplianceID"
       WHERE t."buyerID" = $1`,
      [buyerId]
    );

    res.json({
      buyerId,
      transactions: transactionCheck.rows[0],
      appliances: applianceCheck.rows[0]
    });

  } catch (error: any) {
    console.error('🧪 DEBUG Error:', error);
    res.status(500).json({
      error: error?.message || 'Unknown error',
      code: error?.code,
      detail: error?.detail,
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    });
  }
});

// All routes require authentication
router.use(verifyToken);

// ✅ SPECIFIC routes FIRST - buyer route
router.get('/buyer/:buyerId', getTransactionsByBuyer);

// Get transactions for a specific seller
router.get('/seller/:sellerId', getTransactionsBySeller);

// Get all transactions (admin)
router.get('/', getAllTransactions);

// Get condition options by group IDs
router.get('/condition-options-by-groups', getConditionOptionsByGroupIds);

// ✅ Generic routes go AFTER specific ones
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

// Delete transaction (admin only)
router.delete('/:id', deleteTransaction);

// Manual system cancellation (admin only)
router.post('/:id/system-cancel', verifyToken, triggerSystemCancellation);

export default router;
