'use client';

import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Stack,
  Button,
  Chip,
  CircularProgress,
} from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { useGroupStore } from '@/store/groupStore';
import { useSummary } from '@/hooks/useGroupData';
import { formatCurrency } from '@/lib/format';

export default function DashboardPage() {
  const router = useRouter();
  const currentGroup = useGroupStore((s) => s.currentGroup);
  const groupId = currentGroup?.id ?? '';
  const { data: summary, isLoading } = useSummary(groupId);

  return (
    <Stack spacing={2}>
      <Typography variant="h5" fontWeight="bold" color="primary">
        Resumen del mes
      </Typography>

      {isLoading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : summary ? (
        <>
          <Card sx={{ bgcolor: '#E3F2FD' }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                Disponible este mes
              </Typography>
              <Typography
                variant="h4"
                fontWeight="bold"
                color={summary.available >= 0 ? 'primary' : 'error'}
              >
                {formatCurrency(summary.available)}
              </Typography>
            </CardContent>
          </Card>

          <Stack direction="row" spacing={2}>
            <Card sx={{ flex: 1, bgcolor: '#E8F5E9' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">
                  Ingresos
                </Typography>
                <Typography variant="h6" fontWeight="bold" color="success.main">
                  {formatCurrency(summary.totalIncome)}
                </Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1, bgcolor: '#FFEBEE' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">
                  Gastos
                </Typography>
                <Typography variant="h6" fontWeight="bold" color="error.main">
                  {formatCurrency(summary.totalExpenses)}
                </Typography>
              </CardContent>
            </Card>
          </Stack>

          {summary.goals.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Metas de ahorro
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {summary.goals.map((g) => (
                    <Chip
                      key={g.id}
                      label={`${g.name}: ${Math.round((g.savedAmount / g.targetAmount) * 100)}%`}
                    />
                  ))}
                </Stack>
              </CardContent>
            </Card>
          )}

          <Button variant="outlined" startIcon={<SwapHorizIcon />} onClick={() => router.push('/balance')}>
            Ver balance entre miembros
          </Button>
        </>
      ) : (
        <Typography color="text.secondary">No se pudo cargar el resumen.</Typography>
      )}
    </Stack>
  );
}
