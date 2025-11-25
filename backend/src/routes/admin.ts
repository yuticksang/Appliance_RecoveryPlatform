import express from 'express';
import {
  getAllUsers,
  checkUsername,
  createUser,
  updateUser,
  updateUserStatus,
  deleteUser,
  getAllCategories,
  getAllBrands,
  getAllAppliances,
  createAppliance,
  updateAppliance,
  updateApplianceStatus,
  createCategory,
  updateCategory,
  updateCategoryStatus,
  createBrand,
  updateBrand,
  updateBrandStatus,
  getAllBuyerPrices
} from '../controllers/adminController';
import {
  getAllConditionGroups,
  createConditionGroup,
  updateConditionGroup,
  updateConditionGroupStatus,
  getAllConditionOptions,
  getConditionOptionsByGroup,
  createConditionOption,
  updateConditionOption,
  deleteConditionOption,
  getConditionCategories,
  updateConditionCategories,
  updateDisplayOrders,
  getAllBuyerMarkdowns
} from '../controllers/conditionController';
import { optionalUpload } from '../middleware/upload';

console.log('📍📍📍 admin routes loaded! 📍📍📍');

const router = express.Router();
router.use(express.json());

// =====================================================
// USER MANAGEMENT ROUTES
// =====================================================

// Get all users
router.get('/users', getAllUsers);

// Check if username is available
router.get('/check-username/:username', checkUsername);

// Create new user
router.post('/create-user', createUser);

// Update user
router.put('/users/:id', updateUser);

// Update user status
router.put('/users/:id/status', updateUserStatus);

// Delete user
router.delete('/users/:id', deleteUser);

// =====================================================
// APPLIANCE MANAGEMENT ROUTES
// =====================================================

// Get all categories
router.get('/categories', getAllCategories);

// Get all brands
router.get('/brands', getAllBrands);

// Get all appliances
router.get('/appliances', getAllAppliances);

// Create new appliance
router.post('/appliances', createAppliance);

// Update appliance
router.put('/appliances/:id', updateAppliance);

// Update appliance status
router.put('/appliances/:id/status', updateApplianceStatus);

// =====================================================
// CATEGORY MANAGEMENT ROUTES
// =====================================================

// Create new category
router.post('/categories', createCategory);

// Update category
router.put('/categories/:id', updateCategory);

// Update category status
router.put('/categories/:id/status', updateCategoryStatus);

// =====================================================
// BRAND MANAGEMENT ROUTES
// =====================================================

// Create new brand
router.post('/brands', createBrand);

// Update brand
router.put('/brands/:id', updateBrand);

// Update brand status
router.put('/brands/:id/status', updateBrandStatus);

// =====================================================
// PRICE LIST ROUTES
// =====================================================

// Get all buyer prices
router.get('/buyer-prices', getAllBuyerPrices);

// =====================================================
// CONDITION GROUP MANAGEMENT ROUTES
// =====================================================

// Get all condition groups
router.get('/condition-groups', getAllConditionGroups);

// Create new condition group
router.post('/condition-groups', createConditionGroup);

// Update condition group
router.put('/condition-groups/:id', updateConditionGroup);

// Update condition group status
router.put('/condition-groups/:id/status', updateConditionGroupStatus);

// =====================================================
// CONDITION OPTION MANAGEMENT ROUTES
// =====================================================

// Get all condition options
router.get('/condition-options', getAllConditionOptions);

// Get condition options by group
router.get('/condition-options/group/:groupId', getConditionOptionsByGroup);

// Create new condition option
router.post('/condition-options', optionalUpload, createConditionOption);

// Update condition option
router.put('/condition-options/:id', optionalUpload, updateConditionOption);

// Delete condition option
router.delete('/condition-options/:id', deleteConditionOption);

// =====================================================
// CONDITION CATEGORY ASSOCIATION ROUTES
// =====================================================

// Get categories for a condition
router.get('/condition-options/:conditionId/categories', getConditionCategories);

// Update categories for a condition
router.put('/condition-options/:conditionId/categories', updateConditionCategories);

// Add this route
router.put('/categories/:categoryId/display-orders', updateDisplayOrders);

// =====================================================
// BUYER MARKDOWN ROUTES
// =====================================================

// Get all buyer markdowns
router.get('/buyer-markdowns', getAllBuyerMarkdowns);

export default router;
