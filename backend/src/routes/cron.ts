import { Router } from 'express';
import { autoCancelOverdueTransactions } from '../controllers/cronController';

const router = Router();

// Auto-cancel overdue transactions
// This endpoint should be called by a cron job (e.g., every day at midnight)
// Or can be triggered manually by admin
router.post('/auto-cancel-overdue', autoCancelOverdueTransactions);

export default router;
