import express from 'express';
import {
  getAllUsers,
  checkUsername,
  createUser,
  updateUser,
  updateUserStatus,
  deleteUser
} from '../controllers/adminController';

console.log('📍📍📍 admin routes loaded! 📍📍📍');

const router = express.Router();
router.use(express.json());

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

export default router;
