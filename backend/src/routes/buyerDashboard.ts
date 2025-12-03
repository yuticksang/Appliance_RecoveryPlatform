import express from 'express';
import * as buyerDashboardController from '../controllers/buyerDashboardController';
import { verifyToken } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/transaction/:userId',verifyToken, buyerDashboardController.getCurrentTransactions);
router.get('/appliances-recovered/:userId',verifyToken, buyerDashboardController.getAllAppliancesRecovered);
router.get('/total-payout/:userId',verifyToken, buyerDashboardController.getTotalPayout);
router.get('/active-transactions/:userId',verifyToken, buyerDashboardController.getActiveTransactions);
router.get('/recovery-time-series/:userId', verifyToken, buyerDashboardController.getRecoveryTimeSeries);
export default router;