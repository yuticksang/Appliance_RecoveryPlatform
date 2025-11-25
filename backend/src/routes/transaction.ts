import { Router } from 'express';
import {
  getTransactionsBySeller,
  getAllTransactions,
  getTransactionById,
  createTransaction,
  updateTransactionStatus,
  updateTransaction,
  updateSubmissionDetails
} from '../controllers/transactionController';
import { verifyToken } from '../middleware/authMiddleware';

const router = Router();

// All routes require authentication
router.use(verifyToken);

// Get transactions for a specific seller
router.get('/seller/:sellerId', getTransactionsBySeller);

// Get all transactions (admin)
router.get('/', getAllTransactions);

// Get single transaction by ID
router.get('/:id', getTransactionById);

// Create new transaction
router.post('/', createTransaction);

// Update transaction status
router.put('/:id/status', updateTransactionStatus);

// Update submission details (seller edit when Awaiting Pick Up)
router.put('/:id/submission', updateSubmissionDetails);

// Update transaction (full edit - admin)
router.put('/:id', updateTransaction);

export default router;
