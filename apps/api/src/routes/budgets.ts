import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { listBudgets, upsertBudget } from '../controllers/budgets.controller';

const router = Router();

router.get('/:id/budgets', authenticate, listBudgets);
router.post('/:id/budgets', authenticate, upsertBudget);

export default router;
