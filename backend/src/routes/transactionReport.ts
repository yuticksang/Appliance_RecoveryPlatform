import express from 'express';
import * as TransactionReportController from '../controllers/TransactionReportController';
import { verifyToken } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/:transactionID',verifyToken, TransactionReportController.getTransactionsReportById);
router.post('/saveTransactionReport', verifyToken, TransactionReportController.saveTransactionReport);

export default router;