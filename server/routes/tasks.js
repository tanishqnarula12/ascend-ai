import express from 'express';
import { getTasks, createTask, updateTask, deleteTask, getWeeklyHabits } from '../controllers/taskController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/habits/weekly', protect, getWeeklyHabits);
router.get('/:goalId/tasks', protect, getTasks); // Tasks per goal or just generic
router.get('/', protect, getTasks); // Get all user tasks
router.post('/', protect, createTask);
router.put('/:id', protect, updateTask);
router.delete('/:id', protect, deleteTask);

export default router;
