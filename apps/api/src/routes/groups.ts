import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import {
  listMyGroups,
  createGroup,
  getGroup,
  joinGroup,
  updateGroup,
  getBalance,
  getSummary,
} from '../controllers/groups.controller';

const router = Router();

router.get('/mine', authenticate, listMyGroups);
router.post('/', authenticate, createGroup);
router.get('/:id', authenticate, getGroup);
router.post('/join', authenticate, joinGroup);
router.patch('/:id', authenticate, updateGroup);
router.get('/:id/balance', authenticate, getBalance);
router.get('/:id/summary', authenticate, getSummary);

export default router;
