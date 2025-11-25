import express from 'express';
import {
  getBuyerAppliances,
  addBuyerAppliance,
  updateBuyerAppliance,
  toggleBuyerApplianceStatus,
  deleteBuyerAppliance
} from '../controllers/buyerController';
import { verifyToken } from '../middleware/authMiddleware';

console.log('📍📍📍 buyer routes loaded! 📍📍📍');

const router = express.Router();

// =====================================================
// BUYER APPLIANCE ROUTES
// =====================================================

// Get all appliances for the logged-in buyer
router.get('/appliances', verifyToken, getBuyerAppliances);

// Add a new appliance to buyer's list
router.post('/appliances', verifyToken, addBuyerAppliance);

// Update base price for an appliance
router.put('/appliances/:applianceID', verifyToken, updateBuyerAppliance);

// Toggle status of an appliance (ACTIVE/INACTIVE)
router.put('/appliances/:applianceID/status', verifyToken, toggleBuyerApplianceStatus);

// Delete an appliance from buyer's list
router.delete('/appliances/:applianceID', verifyToken, deleteBuyerAppliance);

export default router;
