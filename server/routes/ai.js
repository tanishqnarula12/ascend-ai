import express from 'express';
import { getInsights, predictConsistency, getDailyBriefing, getAdvancedAnalytics } from '../controllers/aiController.js';
import { startFocusSession, endFocusSession, getFocusStats } from '../controllers/focusController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/insights', protect, getInsights);
router.get('/briefing', protect, getDailyBriefing);
router.get('/advanced-analytics', protect, getAdvancedAnalytics);
router.get('/focus/stats', protect, getFocusStats);
router.post('/focus/start', protect, startFocusSession);
router.put('/focus/end/:id', protect, endFocusSession);
router.post('/predict', protect, predictConsistency);

export default router;
