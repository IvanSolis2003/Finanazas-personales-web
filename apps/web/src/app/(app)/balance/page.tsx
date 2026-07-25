'use client';

import {
  Stack,
  Typography,
  Card,
  CardContent,
  Box,
  CircularProgress,
  Avatar,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useGroupStore } from '@/store/groupStore';
import { useBalance } from '@/hooks/useGroupData';
import { formatCurrency } from '@/lib/format';

export default function BalancePage() {
  const currentGroup = useGroupStore((s) => s.currentGroup);
  const groupId = currentGroup?.id ?? '';
  const { data, isLoading } = useBalance(groupId);

  return (
    <Stack spacing={2}>
      <Typography variant="h5" fontWeight="bold" color="primary">
        Balance entre miembros
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Transacciones mínimas para saldar todas las deudas compartidas.
      </Typography>

      {isLoading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : data && data.transactions.length > 0 ? (
        <Stack spacing={1}>
          {data.transactions.map((t, i) => (
            <Card key={i} variant="outlined">
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1, '&:last-child': { pb: 2 } }}>
                <Avatar sx={{ bgcolor: 'error.light', width: 32, height: 32, fontSize: 14 }}>
                  {t.from.charAt(0).toUpperCase()}
                </Avatar>
                <Typography fontWeight={600}>{t.from}</Typography>
                <ArrowForwardIcon fontSize="small" color="action" />
                <Avatar sx={{ bgcolor: 'success.light', width: 32, height: 32, fontSize: 14 }}>
                  {t.to.charAt(0).toUpperCase()}
                </Avatar>
                <Typography fontWeight={600} sx={{ flexGrow: 1 }}>
                  {t.to}
                </Typography>
                <Typography fontWeight="bold" color="primary">
                  {formatCurrency(t.amount)}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : (
        <Typography color="text.secondary" py={2}>
          Todo saldado. No hay deudas pendientes. 🎉
        </Typography>
      )}
    </Stack>
  );
}
