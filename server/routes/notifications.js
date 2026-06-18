import express from 'express';
import { checkNudges } from '../controllers/notificationController.js';

const router = express.Router();

// No JWT here — triggered by an external cron pinger, not a logged-in user.
// Guarded by a shared secret header instead.
router.post('/check', checkNudges);

export default router;
