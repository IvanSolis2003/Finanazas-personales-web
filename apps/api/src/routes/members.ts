import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { updateSalary, removeMember } from '../controllers/members.controller';

const router = Router();

router.patch('/:id/members/salary', authenticate, updateSalary);
router.delete('/:id/members/:userId', authenticate, removeMember);

export default router;
