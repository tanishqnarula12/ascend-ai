import express from 'express';
import { getGoals, createGoal, updateGoal, deleteGoal, getAnalytics, getReports } from '../controllers/goalController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getGoals);
router.get('/analytics', protect, getAnalytics);
router.get('/reports', protect, getReports);
router.post('/', protect, createGoal);
router.put('/:id', protect, updateGoal);
router.delete('/:id', protect, deleteGoal);

export default router;
