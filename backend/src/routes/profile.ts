import { Router } from 'express';
import {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  getBankDetails,
  createBankDetails,
  updateBankDetails,
  deleteBankDetails
} from '../controllers/profileController';
import { verifyToken } from '../middleware/authMiddleware';

const router = Router();

// Address routes
router.get('/addresses/:userId', verifyToken, getAddresses);
router.post('/addresses/:userId', verifyToken, createAddress);
router.put('/addresses/:userId/:addressId', verifyToken, updateAddress);
router.delete('/addresses/:userId/:addressId', verifyToken, deleteAddress);

// Bank routes
router.get('/bank/:userId', verifyToken, getBankDetails);
router.post('/bank/:userId', verifyToken, createBankDetails);
router.put('/bank/:userId', verifyToken, updateBankDetails);
router.delete('/bank/:userId', verifyToken, deleteBankDetails);

export default router;
