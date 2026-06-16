import express from 'express';
import { getSeasonProgress } from '../controllers/seasonController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/current', protect, getSeasonProgress);

export default router;
