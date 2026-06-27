import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useThemeStore, themeColors } from '@/stores/themeStore';

export default function WelcomeScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const theme = useThemeStore((s) => s.theme);
  const colors = themeColors[theme];

  async function signInWithGoogle() {
    Alert.alert(
      'Google sign-in',
      'Configure Supabase Google OAuth + expo-auth-session to enable this.',
    );
  }

  async function signIn() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Required Fields', 'Please enter both email and password.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ 
      email: email.trim(), 
      password: password.trim() 
    });
    setBusy(false);
    if (error) Alert.alert('Sign in failed', error.message);
  }

  async function createAccount() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Required Fields', 'Please enter both email and password.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signUp({ 
      email: email.trim(), 
      password: password.trim() 
    });
    setBusy(false);
    if (error) {
      Alert.alert('Sign up failed', error.message);
      return;
    }
    router.push({ pathname: '/(auth)/verify-email', params: { email: email.trim() } });
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.paper }]}>
      <View style={styles.scrollContainer}>
        <View style={styles.header}>
          {/* Custom logo icon container */}
          <View style={[styles.logoIcon, { backgroundColor: colors.accent, shadowColor: colors.accent }]}>
            <View style={[styles.logoPaper, { backgroundColor: colors.accentInk }]}>
              <View style={[styles.logoLine, { backgroundColor: colors.accent, width: 12 }]} />
              <View style={[styles.logoLine, { backgroundColor: colors.accent, width: 12 }]} />
              <View style={[styles.logoLine, { backgroundColor: colors.accent, width: 8 }]} />
            </View>
          </View>
          <Text style={[styles.logo, { color: colors.ink }]}>InkSync</Text>
          <Text style={[styles.tagline, { color: colors.ink2 }]}>Your notes, digitized.</Text>
        </View>

        <View style={styles.form}>
          <Pressable 
            style={[styles.googleButton, { backgroundColor: colors.surface, borderColor: colors.line }]} 
            onPress={signInWithGoogle}
          >
            {/* Custom 4-quadrant Google color icon */}
            <View style={styles.googleIconCircle}>
              <View style={styles.googleIconRow}>
                <View style={[styles.googleIconSegment, { backgroundColor: '#ea4335' }]} />
                <View style={[styles.googleIconSegment, { backgroundColor: '#fbbc05' }]} />
              </View>
              <View style={styles.googleIconRow}>
                <View style={[styles.googleIconSegment, { backgroundColor: '#34a853' }]} />
                <View style={[styles.googleIconSegment, { backgroundColor: '#4285f4' }]} />
              </View>
            </View>
            <Text style={[styles.googleText, { color: colors.ink }]}>Continue with Google</Text>
          </Pressable>

          <View style={styles.divider}>
            <View style={[styles.line, { backgroundColor: colors.line }]} />
            <Text style={[styles.or, { color: colors.ink3 }]}>OR</Text>
            <View style={[styles.line, { backgroundColor: colors.line }]} />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.ink2 }]}>Email</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface2, borderColor: colors.line, color: colors.ink }]}
              placeholder="you@example.com"
              placeholderTextColor={colors.ink3}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.ink2 }]}>Password</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface2, borderColor: colors.line, color: colors.ink }]}
              placeholder="••••••••"
              placeholderTextColor={colors.ink3}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <Pressable
            style={[styles.button, { backgroundColor: colors.accent, shadowColor: colors.accent }]}
            onPress={signIn}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color={colors.accentInk} />
            ) : (
              <Text style={[styles.primaryText, { color: colors.accentInk }]}>Sign in</Text>
            )}
          </Pressable>

          <Pressable
            style={styles.textButton}
            onPress={createAccount}
            disabled={busy}
          >
            <Text style={[styles.secondaryText, { color: colors.accent }]}>Create account</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
  },
  header: { 
    alignItems: 'flex-start', 
    marginBottom: 36,
  },
  logoIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  logoPaper: {
    width: 22,
    height: 26,
    borderRadius: 3,
    borderBottomLeftRadius: 8,
    paddingTop: 6,
    alignItems: 'center',
    gap: 3,
  },
  logoLine: {
    height: 2,
    borderRadius: 1,
  },
  logo: { 
    fontSize: 40, 
    fontWeight: '700', 
    letterSpacing: -1,
    marginTop: 26,
    marginBottom: 6,
  },
  tagline: { 
    fontSize: 17, 
    fontWeight: '500',
  },
  form: {
    width: '100%',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 11,
    width: '100%',
    height: 54,
    borderRadius: 15,
    borderWidth: 1.5,
  },
  googleIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    overflow: 'hidden',
  },
  googleIconRow: {
    flexDirection: 'row',
    flex: 1,
  },
  googleIconSegment: {
    flex: 1,
  },
  googleText: { 
    fontWeight: '600', 
    fontSize: 16,
  },
  divider: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginVertical: 20,
    paddingHorizontal: 4,
  },
  line: { 
    flex: 1, 
    height: 1, 
  },
  or: { 
    marginHorizontal: 12, 
    fontSize: 12,
    fontWeight: '600', 
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'column',
    gap: 6,
    marginBottom: 13,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '600',
    paddingLeft: 2,
  },
  input: {
    height: 52,
    borderRadius: 13,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  button: { 
    width: '100%',
    height: 54, 
    borderRadius: 15, 
    alignItems: 'center', 
    justifyContent: 'center',
    marginTop: 12,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  primaryText: { 
    fontWeight: '700',
    fontSize: 16.5,
  },
  textButton: {
    width: '100%',
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  secondaryText: { 
    fontWeight: '600',
    fontSize: 15,
  },
});

