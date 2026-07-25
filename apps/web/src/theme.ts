'use client';
import { createTheme } from '@mui/material/styles';

// Paleta alineada con la app móvil (primary azul #1976D2).
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976D2' },
    secondary: { main: '#42A5F5' },
    success: { main: '#388E3C' },
    error: { main: '#D32F2F' },
    warning: { main: '#F57C00' },
    background: { default: '#F5F5F5' },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: 'Roboto, system-ui, -apple-system, sans-serif',
  },
});
