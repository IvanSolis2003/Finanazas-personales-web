import { redirect } from 'next/navigation';
import { getSessionUserId } from '@/lib/auth';

// Página raíz: decide a dónde entrar según haya sesión o no.
export default async function Home() {
  const userId = await getSessionUserId();
  redirect(userId ? '/dashboard' : '/login');
}
