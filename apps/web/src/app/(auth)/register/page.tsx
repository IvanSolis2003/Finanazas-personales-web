'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, Typography, TextField, Button, Stack, Alert } from '@mui/material';
import { useRegister } from '@/hooks/useAuth';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const register = useRegister();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    register.mutate({ name: name.trim(), email: email.trim(), password });
  }

  return (
    <Card elevation={3}>
      <CardContent sx={{ p: 4 }}>
        <Typography variant="h4" align="center" fontWeight="bold" color="primary" gutterBottom>
          Crear cuenta
        </Typography>
        <Typography variant="body1" align="center" color="text.secondary" mb={3}>
          Únete a Iasmtech Finanzas
        </Typography>

        {register.isSuccess ? (
          <Stack spacing={2}>
            <Alert severity="success">{register.data.message}</Alert>
            <Button component={Link} href="/login" variant="contained">
              Ir a iniciar sesión
            </Button>
          </Stack>
        ) : (
        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            {register.isError && <Alert severity="error">{register.error.message}</Alert>}
            <TextField
              label="Nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
              fullWidth
            />
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
              autoComplete="new-password"
              helperText="Mínimo 6 caracteres"
              required
              fullWidth
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={register.isPending}
              fullWidth
            >
              {register.isPending ? 'Creando…' : 'Registrarme'}
            </Button>
            <Button component={Link} href="/login" variant="text">
              ¿Ya tienes cuenta? Inicia sesión
            </Button>
          </Stack>
        </form>
        )}
      </CardContent>
    </Card>
  );
}
