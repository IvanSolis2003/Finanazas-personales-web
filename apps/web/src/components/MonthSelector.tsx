'use client';

import { Box, IconButton, Typography, Button } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useMonthStore, MONTH_NAMES } from '@/store/monthStore';

export function MonthSelector() {
  const { month, year, prev, next, reset } = useMonthStore();
  const now = new Date();
  const isCurrent = month === now.getMonth() + 1 && year === now.getFullYear();

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        py: 0.5,
      }}
    >
      <IconButton size="small" onClick={prev} aria-label="Mes anterior">
        <ChevronLeftIcon />
      </IconButton>
      <Box sx={{ textAlign: 'center', minWidth: 150 }}>
        <Typography fontWeight={600}>
          {MONTH_NAMES[month - 1]} {year}
        </Typography>
        {!isCurrent && (
          <Button size="small" onClick={reset} sx={{ py: 0, minWidth: 0, fontSize: 11 }}>
            Volver al mes actual
          </Button>
        )}
      </Box>
      <IconButton size="small" onClick={next} aria-label="Mes siguiente">
        <ChevronRightIcon />
      </IconButton>
    </Box>
  );
}
