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

export default function WelcomeScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function signInWithGoogle() {
    // Google OAuth requires expo-auth-session / a configured redirect; wire it
    // up against your Supabase Google provider in week 1. Stubbed for the
    // scaffold so the email path is usable immediately.
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
    // On success, the auth listener in the root layout redirects to /home.
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
    // Supabase sends a confirmation OTP/email; collect the code on /verify-email.
    router.push({ pathname: '/(auth)/verify-email', params: { email: email.trim() } });
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>InkSync</Text>
        <Text style={styles.tagline}>Your notes, digitized</Text>
      </View>

      <Pressable style={styles.googleButton} onPress={signInWithGoogle}>
        <Text style={styles.googleText}>Continue with Google</Text>
      </Pressable>

      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.or}>or</Text>
        <View style={styles.line} />
      </View>

      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <View style={styles.row}>
        <Pressable
          style={[styles.button, styles.primary]}
          onPress={signIn}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>Sign in</Text>
          )}
        </Pressable>
        <Pressable
          style={[styles.button, styles.secondary]}
          onPress={createAccount}
          disabled={busy}
        >
          <Text style={styles.secondaryText}>Create account</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff' },
  header: { alignItems: 'center', marginBottom: 40 },
  logo: { fontSize: 40, fontWeight: '800', color: '#111' },
  tagline: { marginTop: 6, fontSize: 15, color: '#777' },
  googleButton: {
    backgroundColor: '#111',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  googleText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: '#ddd' },
  or: { marginHorizontal: 12, color: '#999' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 12,
  },
  row: { flexDirection: 'row', gap: 12, marginTop: 4 },
  button: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  primary: { backgroundColor: '#2563eb' },
  primaryText: { color: '#fff', fontWeight: '600' },
  secondary: { borderWidth: 1, borderColor: '#2563eb' },
  secondaryText: { color: '#2563eb', fontWeight: '600' },
});
