import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import {
  listProposals,
  createProposal,
  voteProposal,
  updateProposal,
} from '../controllers/proposals.controller';

const router = Router();

router.get('/:id/proposals', authenticate, listProposals);
router.post('/:id/proposals', authenticate, createProposal);
router.post('/:id/proposals/:propId/vote', authenticate, voteProposal);
router.patch('/:id/proposals/:propId', authenticate, updateProposal);

export default router;
