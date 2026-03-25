import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { listGoals, createGoal, updateGoal } from '../controllers/goals.controller';

const router = Router();

router.get('/:id/goals', authenticate, listGoals);
router.post('/:id/goals', authenticate, createGoal);
router.patch('/:id/goals/:goalId', authenticate, updateGoal);

export default router;
