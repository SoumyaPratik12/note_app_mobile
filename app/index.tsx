import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

// Entry route. The root layout also guards navigation, but a concrete "/"
// route is required; this redirects based on the current session.
export default function Index() {
  const session = useAuthStore((s) => s.session);
  return <Redirect href={session ? '/(app)/home' : '/(auth)/welcome'} />;
}
