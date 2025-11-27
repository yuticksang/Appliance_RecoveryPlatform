import express from 'express';
import {
  getBuyerAppliances,
  addBuyerAppliance,
  updateBuyerAppliance,
  toggleBuyerApplianceStatus,
  deleteBuyerAppliance
} from '../controllers/buyerController';
import {
  getBuyerConditionGroups,
  getBuyerConditionOptions,
  getBuyerCategories,
  getBuyerMarkdowns,
  saveBuyerMarkdowns,
  updateSingleBuyerMarkdown,
  deleteBuyerMarkdown
} from '../controllers/buyerMarkdownController';
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

// =====================================================
// BUYER MARKDOWN ROUTES
// =====================================================

// Get all active condition groups (filtered for radio, checkbox, image_selection)
router.get('/condition-groups', verifyToken, getBuyerConditionGroups);

// Get all active condition options (filtered for radio, checkbox, image_selection)
router.get('/condition-options', verifyToken, getBuyerConditionOptions);

// Get all active categories
router.get('/categories', verifyToken, getBuyerCategories);

// Get buyer's markdowns
router.get('/markdowns', verifyToken, getBuyerMarkdowns);

// Save/update buyer's markdowns (bulk)
router.post('/markdowns', verifyToken, saveBuyerMarkdowns);

// Update a single markdown
router.put('/markdowns/:conditionId', verifyToken, updateSingleBuyerMarkdown);

// Delete a single markdown
router.delete('/markdowns/:conditionId', verifyToken, deleteBuyerMarkdown);

export default router;
