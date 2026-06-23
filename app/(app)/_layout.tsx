import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home" />
      <Stack.Screen name="search" />
      <Stack.Screen name="note/[id]" />
      {/* Camera screens present modally over the rest of the app. */}
      <Stack.Screen name="capture/new" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="capture/[id]" options={{ presentation: 'fullScreenModal' }} />
    </Stack>
  );
}
