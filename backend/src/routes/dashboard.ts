import express from 'express';
import * as dashboardController from '../controllers/dashboardController';
import { verifyToken } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/transaction',verifyToken, dashboardController.getCurrentTransactions);
router.get('/appliances-recovered',verifyToken, dashboardController.getAllAppliancesRecovered);
router.get('/total-payout',verifyToken, dashboardController.getTotalPayout);
router.get('/active-users',verifyToken, dashboardController.getActiveUsers);
router.get('/active-transactions',verifyToken, dashboardController.getActiveTransactions);
router.get('/recovery-time-series', verifyToken, dashboardController.getRecoveryTimeSeries);
router.get('/category-recovery-data', verifyToken, dashboardController.getCategoryRecoveryData);
router.get('/brand-recovery-data', verifyToken, dashboardController.getBrandRecoveryData);
router.get('/condition-score-data', verifyToken, dashboardController.getConditionScoreData);
router.get('/top5-recovered-models', verifyToken, dashboardController.getTop5RecoveredModel);

export default router;