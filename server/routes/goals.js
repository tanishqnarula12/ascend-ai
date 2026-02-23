import express from 'express';
import { getGoals, createGoal, updateGoal, deleteGoal, getAnalytics } from '../controllers/goalController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/analytics', protect, getAnalytics);
router.get('/', protect, getGoals);
router.post('/', protect, createGoal);
router.put('/:id', protect, updateGoal);
router.delete('/:id', protect, deleteGoal);

export default router;
