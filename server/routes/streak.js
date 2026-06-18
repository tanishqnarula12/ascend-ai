import express from 'express';
import { getStreakStatus, reviveStreak } from '../controllers/streakController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/status', protect, getStreakStatus);
router.post('/revive', protect, reviveStreak);

export default router;
