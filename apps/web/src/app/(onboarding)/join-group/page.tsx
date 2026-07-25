'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, Typography, TextField, Button, Stack, Alert } from '@mui/material';
import { useJoinGroup } from '@/hooks/useGroups';
import { useGroupStore } from '@/store/groupStore';

export default function JoinGroupPage() {
  const [inviteCode, setInviteCode] = useState('');
  const router = useRouter();
  const joinGroup = useJoinGroup();
  const setCurrentGroup = useGroupStore((s) => s.setCurrentGroup);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    joinGroup.mutate(
      { inviteCode: inviteCode.trim() },
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
          Unirme a un grupo
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Ingresa el código de invitación que te compartieron.
        </Typography>

        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            {joinGroup.isError && <Alert severity="error">{joinGroup.error.message}</Alert>}
            <TextField
              label="Código de invitación"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              required
              fullWidth
              autoFocus
              slotProps={{ input: { style: { letterSpacing: 2 } } }}
            />
            <Button type="submit" variant="contained" size="large" disabled={joinGroup.isPending}>
              {joinGroup.isPending ? 'Uniéndome…' : 'Unirme'}
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
