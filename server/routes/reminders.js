import express from 'express';
import { listReminders, createReminder, deleteReminder, checkReminders } from '../controllers/reminderController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, listReminders);
router.post('/', protect, createReminder);
router.delete('/:id', protect, deleteReminder);
// No JWT here — triggered by an external cron pinger, not a logged-in user. Guarded by a shared secret header instead.
router.post('/check', checkReminders);

export default router;
