import { Router } from 'express';
import {
  getPackagingInstructions,
  getAllPackagingInstructions,
  createPackagingInstruction,
  updatePackagingInstruction,
  deletePackagingInstruction
} from '../controllers/packagingInstructionController';
import { verifyToken } from '../middleware/authMiddleware';

const router = Router();

// Public route - Get packaging instructions by category (for sellers viewing after submission)
router.get('/packaging-instructions/:categoryId', verifyToken, getPackagingInstructions);

// Admin routes - Manage packaging instructions
router.get('/admin/packaging-instructions', verifyToken, getAllPackagingInstructions);
router.post('/admin/packaging-instructions', verifyToken, createPackagingInstruction);
router.put('/admin/packaging-instructions/:instructionId', verifyToken, updatePackagingInstruction);
router.delete('/admin/packaging-instructions/:instructionId', verifyToken, deletePackagingInstruction);

export default router;