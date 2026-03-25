import { Router } from 'express';
import { register, login, refresh, logout, updatePushToken } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.patch('/push-token', authenticate, updatePushToken);

export default router;
