'use client';

import { useState } from 'react';
import {
  Stack,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Box,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  Fab,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useGroupStore } from '@/store/groupStore';
import { useMe } from '@/hooks/useAuth';
import {
  useProposals,
  useCreateProposal,
  useVoteProposal,
  type Proposal,
} from '@/hooks/useProposals';
import { formatCurrency, CATEGORY_LABELS } from '@/lib/format';
import { EXPENSE_CATEGORIES } from '@/lib/validations';

const STATUS: Record<string, { label: string; color: 'default' | 'success' | 'error' | 'warning' }> = {
  PENDING: { label: 'Pendiente', color: 'warning' },
  APPROVED: { label: 'Aprobada', color: 'success' },
  REJECTED: { label: 'Rechazada', color: 'error' },
  POSTPONED: { label: 'Pospuesta', color: 'default' },
};

export default function ProposalsPage() {
  const currentGroup = useGroupStore((s) => s.currentGroup);
  const groupId = currentGroup?.id ?? '';
  const { data: proposals, isLoading } = useProposals(groupId);
  const { data: me } = useMe();
  const vote = useVoteProposal(groupId);
  const [open, setOpen] = useState(false);

  return (
    <Stack spacing={2}>
      <Typography variant="h5" fontWeight="bold" color="primary">
        Propuestas
      </Typography>

      {isLoading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : proposals && proposals.length > 0 ? (
        <Stack spacing={1.5}>
          {proposals.map((p) => (
            <ProposalCard
              key={p.id}
              proposal={p}
              myUserId={me?.id}
              onVote={(v) => vote.mutate({ propId: p.id, vote: v })}
              voting={vote.isPending}
            />
          ))}
        </Stack>
      ) : (
        <Typography color="text.secondary" py={2}>
          No hay propuestas todavía.
        </Typography>
      )}

      <Fab
        color="primary"
        onClick={() => setOpen(true)}
        sx={{ position: 'fixed', bottom: 24, right: 24 }}
        aria-label="Nueva propuesta"
      >
        <AddIcon />
      </Fab>

      <AddProposalDialog open={open} onClose={() => setOpen(false)} groupId={groupId} />
    </Stack>
  );
}

function ProposalCard({
  proposal,
  myUserId,
  onVote,
  voting,
}: {
  proposal: Proposal;
  myUserId?: string;
  onVote: (v: 'APPROVE' | 'REJECT') => void;
  voting: boolean;
}) {
  const st = STATUS[proposal.status];
  const myVote = proposal.votes.find((v) => v.userId === myUserId)?.vote;
  const approveCount = proposal.votes.filter((v) => v.vote === 'APPROVE').length;

  return (
    <Card variant="outlined">
      <CardContent>
        <Box display="flex" alignItems="flex-start" gap={1}>
          <Box flexGrow={1}>
            <Typography fontWeight={700}>{proposal.title}</Typography>
            {proposal.description && (
              <Typography variant="body2" color="text.secondary">
                {proposal.description}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary">
              {CATEGORY_LABELS[proposal.category]} · por {proposal.proposedBy.name}
              {proposal.isPersonal ? ' · personal' : ''}
            </Typography>
          </Box>
          <Chip size="small" label={st.label} color={st.color} />
        </Box>

        <Typography variant="h6" fontWeight="bold" color="primary" mt={1}>
          {formatCurrency(proposal.amount)}
        </Typography>

        {proposal.status === 'APPROVED' && (
          <Typography variant="caption" color="success.main" display="block" mt={0.5}>
            ✓ Se agregó a los gastos del mes.
          </Typography>
        )}

        {proposal.status === 'PENDING' && (
          <Box mt={1}>
            <Typography variant="caption" color="text.secondary">
              {approveCount} voto(s) a favor{myVote ? ` · tu voto: ${myVote}` : ''}
            </Typography>
            <Stack direction="row" spacing={1} mt={1}>
              <Button
                size="small"
                variant="contained"
                color="success"
                disabled={voting}
                onClick={() => onVote('APPROVE')}
              >
                Aprobar
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                disabled={voting}
                onClick={() => onVote('REJECT')}
              >
                Rechazar
              </Button>
            </Stack>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

function AddProposalDialog({
  open,
  onClose,
  groupId,
}: {
  open: boolean;
  onClose: () => void;
  groupId: string;
}) {
  const createProposal = useCreateProposal(groupId);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('OTHER');

  function submit() {
    createProposal.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        amount: Number(amount),
        category,
      },
      {
        onSuccess: () => {
          setTitle('');
          setDescription('');
          setAmount('');
          onClose();
        },
      },
    );
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Nueva propuesta</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          {createProposal.isError && <Alert severity="error">{createProposal.error.message}</Alert>}
          <TextField label="Título" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth autoFocus />
          <TextField
            label="Descripción (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={2}
          />
          <TextField
            label="Monto (CLP)"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            fullWidth
          />
          <TextField
            select
            label="Categoría"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            fullWidth
          >
            {EXPENSE_CATEGORIES.map((c) => (
              <MenuItem key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={submit} disabled={createProposal.isPending || !title.trim() || !amount}>
          Crear
        </Button>
      </DialogActions>
    </Dialog>
  );
}
