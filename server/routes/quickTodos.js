import express from 'express';
import { getTodos, createTodo, toggleTodo, deleteTodo, clearCompleted } from '../controllers/quickTodoController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getTodos);
router.post('/', protect, createTodo);
router.put('/:id/toggle', protect, toggleTodo);
// /completed must be declared before /:id so Express doesn't swallow it as an id
router.delete('/completed', protect, clearCompleted);
router.delete('/:id', protect, deleteTodo);

export default router;
