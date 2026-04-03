import express from 'express';
import { register, login, googleLogin, getProfile } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.get('/profile', protect, getProfile);

export default router;
