import express from 'express';
import { subscribe, unsubscribe } from '../controllers/pushController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/subscribe', protect, subscribe);
router.post('/unsubscribe', protect, unsubscribe);

export default router;
