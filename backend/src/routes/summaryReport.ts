import express from 'express';
import * as summaryReportController from '../controllers/summaryReportController';
import { verifyToken } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/',verifyToken, summaryReportController.getSummaryReportByDate);
router.post('/save', verifyToken, summaryReportController.saveSummaryReport);
export default router;