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
  deleteAppliance
} from '../controllers/adminController';

console.log('📍📍📍 admin routes loaded! 📍📍📍');

const router = express.Router();

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

// Delete appliance
router.delete('/appliances/:id', deleteAppliance);

export default router;
