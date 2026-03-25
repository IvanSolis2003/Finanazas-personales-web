import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { listAlerts, markAllRead } from '../controllers/alerts.controller';

const router = Router();

router.get('/:id/alerts', authenticate, listAlerts);
router.patch('/:id/alerts/read-all', authenticate, markAllRead);

export default router;
