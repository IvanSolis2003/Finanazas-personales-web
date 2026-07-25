'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, Typography, TextField, Button, Stack, Alert, Box } from '@mui/material';
import { useLogin } from '@/hooks/useAuth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useLogin();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    login.mutate({ email: email.trim(), password });
  }

  return (
    <Card elevation={3}>
      <CardContent sx={{ p: 4 }}>
        <Box
          component="img"
          src="/logo-iasmtech.svg"
          alt="Iasmtech"
          sx={{ display: 'block', width: '100%', maxWidth: 260, height: 'auto', mx: 'auto', mb: 1 }}
        />
        <Typography variant="body1" align="center" color="text.secondary" mb={3}>
          Finanzas · Inicia sesión
        </Typography>

        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            {login.isError && <Alert severity="error">{login.error.message}</Alert>}
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              fullWidth
            />
            <TextField
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              fullWidth
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={login.isPending}
              fullWidth
            >
              {login.isPending ? 'Ingresando…' : 'Ingresar'}
            </Button>
            <Button component={Link} href="/register" variant="text">
              ¿No tienes cuenta? Regístrate
            </Button>
          </Stack>
        </form>
      </CardContent>
    </Card>
  );
}
