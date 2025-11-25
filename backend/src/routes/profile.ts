import express from 'express';
import {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  getBankDetails,
  createBankDetails,
  updateBankDetails,
  deleteBankDetails,
  setDefaultAddress
} from '../controllers/profileController';
import { verifyToken } from '../middleware/authMiddleware';

const router = express.Router();
router.use(express.json());

// Address routes
router.get('/addresses/:userId', verifyToken, getAddresses);
router.post('/addresses/:userId', verifyToken, createAddress);
router.put('/addresses/:userId/:addressId', verifyToken, updateAddress);
router.delete('/addresses/:userId/:addressId', verifyToken, deleteAddress);
router.patch('/addresses/:userId/:addressId/default', verifyToken, setDefaultAddress);

// Bank routes
router.get('/bank/:userId', verifyToken, getBankDetails);
router.post('/bank/:userId', verifyToken, createBankDetails);
router.put('/bank/:userId', verifyToken, updateBankDetails);
router.delete('/bank/:userId', verifyToken, deleteBankDetails);

export default router;
