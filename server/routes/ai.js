import express from 'express';
import { getInsights, predictConsistency } from '../controllers/aiController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/insights', protect, getInsights);
router.post('/predict', protect, predictConsistency);

export default router;
