import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { listExpenses, createExpense, deleteExpense } from '../controllers/expenses.controller';

const router = Router();

router.get('/:id/expenses', authenticate, listExpenses);
router.post('/:id/expenses', authenticate, createExpense);
router.delete('/:id/expenses/:expId', authenticate, deleteExpense);

export default router;
