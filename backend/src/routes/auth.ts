import { Router } from 'express';
import { login, register, forgotPassword, resetPassword, verifyEmail, validateToken, getProfile, updateProfile, googleLogin } from '../controllers/authController';
import { verifyToken as verifyTokenMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/verify-email/:token', verifyEmail);
router.get('/validate', verifyTokenMiddleware, validateToken);
router.get('/profile/:id', verifyTokenMiddleware, getProfile);
router.put('/profile/:id', verifyTokenMiddleware, updateProfile);

export default router;