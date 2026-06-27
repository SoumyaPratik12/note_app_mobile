import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore, themeColors } from '@/stores/themeStore';
import { registerForPushNotifications } from '@/lib/notifications';

export default function RootLayout() {
  const init = useAuthStore((s) => s.init);
  const session = useAuthStore((s) => s.session);
  const initializing = useAuthStore((s) => s.initializing);
  const segments = useSegments();
  const router = useRouter();
  const theme = useThemeStore((s) => s.theme);
  const colors = themeColors[theme];

  // Wire up Supabase auth once.
  useEffect(() => init(), [init]);

  // Register for push notifications after sign-in.
  useEffect(() => {
    if (session?.user.id) {
      registerForPushNotifications(session.user.id).catch((e) =>
        console.warn('[push] registration failed:', e),
      );
    }
  }, [session?.user.id]);

  // Redirect based on auth state.
  useEffect(() => {
    if (initializing) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/welcome');
    } else if (session && inAuthGroup) {
      router.replace('/(app)/home');
    }
  }, [session, initializing, segments, router]);

  if (initializing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaProvider style={{ backgroundColor: colors.paper }}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <View style={{ flex: 1, backgroundColor: colors.paper }}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
        </Stack>
      </View>
    </SafeAreaProvider>
  );
}

