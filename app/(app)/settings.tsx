import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Alert, ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore, themeColors } from '@/stores/themeStore';
import { supabase } from '@/lib/supabase';

export default function SettingsScreen() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const signOut = useAuthStore((s) => s.signOut);
  const [busy, setBusy] = useState(false);

  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const pushNotif = useThemeStore((s) => s.pushNotif);
  const togglePush = useThemeStore((s) => s.togglePush);
  const colors = themeColors[theme];

  // Animated switches state
  const darkKnobAnim = useRef(new Animated.Value(theme === 'dark' ? 1 : 0)).current;
  const pushKnobAnim = useRef(new Animated.Value(pushNotif ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(darkKnobAnim, {
      toValue: theme === 'dark' ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [theme, darkKnobAnim]);

  useEffect(() => {
    Animated.timing(pushKnobAnim, {
      toValue: pushNotif ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [pushNotif, pushKnobAnim]);

  const darkKnobTranslateX = darkKnobAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 20],
  });

  const pushKnobTranslateX = pushKnobAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 20],
  });

  async function handleSignOut() {
    try {
      await signOut();
    } catch (e) {
      console.warn('[settings] sign out failed:', e);
    }
  }

  async function restoreSampleNotes() {
    if (!session?.user.id) return;
    setBusy(true);
    try {
      const samples = [
        { 
          user_id: session.user.id, 
          title: 'Q3 Planning Notes', 
          content: 'Q3 priorities — ship the capture flow, push OCR latency under two seconds, and lock the onboarding copy before the design review on Thursday.\n\nOpen question: do we batch process pages or stream them one at a time? Marcus prefers streaming for perceived speed.', 
          status: 'open',
          page_count: 2
        },
        { 
          user_id: session.user.id, 
          title: 'Sourdough Recipe', 
          content: 'Levain: 50g starter, 50g flour, 50g water. Rest four hours until doubled and domed.\n\nBulk ferment at room temp, three sets of stretch and folds every 30 minutes.', 
          status: 'complete',
          page_count: 2
        },
        { 
          user_id: session.user.id, 
          title: 'Book Ideas', 
          content: 'A field guide to quiet places. Each chapter a different kind of silence — libraries, snowfall, the pause before applause.', 
          status: 'complete',
          page_count: 1
        },
        { 
          user_id: session.user.id, 
          title: 'Standup — Monday', 
          content: 'Blockers: staging env keeps timing out. Priya owns the fix, ETA end of day.', 
          status: 'complete',
          page_count: 4
        }
      ];
      const { error } = await supabase.from('notes').insert(samples);
      if (error) throw error;
      Alert.alert('Success', 'Sample notes successfully restored in database.');
    } catch (e) {
      Alert.alert('Failed to restore notes', (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const userEmail = session?.user?.email || 'Not logged in';
  const userInitial = userEmail.charAt(0).toUpperCase();
  const userName = userEmail.split('@')[0];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.paper }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
          <View style={[styles.backArrow, { borderColor: colors.ink }]} />
        </Pressable>
        <Text style={[styles.title, { color: colors.ink }]}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.content}>
        {/* User Card */}
        <View style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.line, shadowColor: colors.shadow }]}>
          <View style={[styles.avatar, { backgroundColor: colors.accentSoft }]}>
            <Text style={[styles.avatarText, { color: colors.accent }]}>{userInitial}</Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={[styles.userNameText, { color: colors.ink }]}>{userName}</Text>
            <Text style={[styles.userEmailText, { color: colors.ink2 }]} numberOfLines={1}>{userEmail}</Text>
          </View>
        </View>

        {/* Preferences Section */}
        <Text style={[styles.sectionTitle, { color: colors.ink3 }]}>Preferences</Text>
        <View style={[styles.prefCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          {/* Dark Mode Preference */}
          <View style={[styles.prefRow, { borderBottomColor: colors.line }]}>
            <View style={styles.prefLabelContainer}>
              <Text style={styles.prefEmoji}>{theme === 'dark' ? '🌙' : '☀️'}</Text>
              <Text style={[styles.prefText, { color: colors.ink }]}>Dark mode</Text>
            </View>
            <Pressable 
              style={[styles.switchTrack, { backgroundColor: theme === 'dark' ? colors.accent : colors.line }]}
              onPress={toggleTheme}
              aria-label="Toggle dark mode"
            >
              <Animated.View 
                style={[
                  styles.switchKnob, 
                  { transform: [{ translateX: darkKnobTranslateX }] }
                ]} 
              />
            </Pressable>
          </View>

          {/* Push Notification Preference */}
          <View style={styles.prefRow}>
            <View style={styles.prefLabelContainer}>
              <Text style={styles.prefEmoji}>🔔</Text>
              <Text style={[styles.prefText, { color: colors.ink }]}>Push notifications</Text>
            </View>
            <Pressable 
              style={[styles.switchTrack, { backgroundColor: pushNotif ? colors.accent : colors.line }]}
              onPress={togglePush}
              aria-label="Toggle notifications"
            >
              <Animated.View 
                style={[
                  styles.switchKnob, 
                  { transform: [{ translateX: pushKnobTranslateX }] }
                ]} 
              />
            </Pressable>
          </View>
        </View>

        {/* Action Buttons */}
        <Pressable 
          style={[styles.signOutButton, { backgroundColor: colors.surface, borderColor: colors.line }]} 
          onPress={handleSignOut}
        >
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>

        <Pressable 
          style={[styles.restoreButton, { borderColor: colors.line }]} 
          onPress={restoreSampleNotes}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color={colors.ink2} />
          ) : (
            <Text style={[styles.restoreText, { color: colors.ink2 }]}>Restore sample notes</Text>
          )}
        </Pressable>

        {/* Version Info Footer */}
        <View style={styles.footerInfo}>
          <Text style={[styles.footerTitle, { color: colors.ink2 }]}>InkSync</Text>
          <Text style={[styles.footerText, { color: colors.ink3 }]}>Your notes, digitized · v1.4.0</Text>
          <Text style={[styles.footerNote, { color: colors.ink3 }]}>
            Notes are saved in the cloud. OCR runs on a live vision model.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  backButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    width: 12,
    height: 12,
    borderLeftWidth: 2.4,
    borderBottomWidth: 2.4,
    transform: [{ rotate: '45deg' }],
    marginLeft: 4,
  },
  title: {
    fontSize: 21,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  placeholder: {
    width: 42,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 30,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 17,
    borderWidth: 1,
    marginBottom: 22,
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 19,
    fontWeight: '700',
  },
  userDetails: {
    flex: 1,
    marginLeft: 14,
  },
  userNameText: {
    fontSize: 15.5,
    fontWeight: '600',
  },
  userEmailText: {
    fontSize: 13,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 4,
  },
  prefCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 22,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 17,
    borderBottomWidth: 1,
  },
  prefLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  prefEmoji: {
    fontSize: 18,
  },
  prefText: {
    fontSize: 15.5,
    fontWeight: '500',
  },
  switchTrack: {
    width: 50,
    height: 30,
    borderRadius: 15,
    position: 'relative',
    padding: 3,
    justifyContent: 'center',
  },
  switchKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  signOutButton: {
    width: '100%',
    height: 52,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  signOutText: {
    color: '#c0392b',
    fontSize: 15.5,
    fontWeight: '600',
  },
  restoreButton: {
    width: '100%',
    height: 48,
    borderRadius: 15,
    borderWidth: 1,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  restoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footerInfo: {
    alignItems: 'center',
    marginTop: 10,
  },
  footerTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  footerText: {
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 2,
  },
  footerNote: {
    fontSize: 11.5,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
  },
});

