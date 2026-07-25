'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, Typography, TextField, Button, Stack, Alert } from '@mui/material';
import { useCreateGroup } from '@/hooks/useGroups';
import { useGroupStore } from '@/store/groupStore';

export default function CreateGroupPage() {
  const [name, setName] = useState('');
  const router = useRouter();
  const createGroup = useCreateGroup();
  const setCurrentGroup = useGroupStore((s) => s.setCurrentGroup);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createGroup.mutate(
      { name: name.trim() },
      {
        onSuccess: (group) => {
          setCurrentGroup(group);
          router.replace('/dashboard');
        },
      },
    );
  }

  return (
    <Card elevation={3}>
      <CardContent sx={{ p: 4 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Crear grupo
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Se generará un código de invitación para compartir.
        </Typography>

        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            {createGroup.isError && <Alert severity="error">{createGroup.error.message}</Alert>}
            <TextField
              label="Nombre del grupo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Casa, Pareja, Roomies…"
              required
              fullWidth
              autoFocus
            />
            <Button type="submit" variant="contained" size="large" disabled={createGroup.isPending}>
              {createGroup.isPending ? 'Creando…' : 'Crear grupo'}
            </Button>
            <Button component={Link} href="/select-group" variant="text">
              Volver
            </Button>
          </Stack>
        </form>
      </CardContent>
    </Card>
  );
}
