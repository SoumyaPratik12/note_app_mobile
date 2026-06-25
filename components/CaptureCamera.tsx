import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CaptureGuideOverlay } from './CaptureGuideOverlay';

interface Props {
  /** Shown as a persistent banner (e.g. "Adding to: Physics notes · Page 4"). */
  bannerTitle?: string;
  bannerSubtitle?: string;
  /** Label for the secondary bottom-left action; omit to hide it. */
  secondaryActionLabel?: string;
  onClose: () => void;
  onSecondaryAction?: () => void;
  /** Receives the captured JPEG as base64. Resolve when processing is done. */
  onCapture: (base64: string) => Promise<void>;
}

export function CaptureCamera({
  bannerTitle,
  bannerSubtitle,
  secondaryActionLabel,
  onClose,
  onSecondaryAction,
  onCapture,
}: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  // Ask for permission automatically the first time the screen opens.
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  if (!permission) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.permissionText}>
          InkSync needs camera access to photograph your notes.
        </Text>
        <Pressable style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant access</Text>
        </Pressable>
        <Pressable onPress={onClose} hitSlop={12}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  async function capture() {
    if (busy || !ready || !cameraRef.current) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.6,
        skipProcessing: false,
      });
      if (!photo?.base64) {
        throw new Error('No image data returned from the camera.');
      }
      await onCapture(photo.base64);
      // Brief success confirmation so the capture is visibly acknowledged.
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    } catch (e) {
      Alert.alert('Capture failed', (e as Error).message || 'Unknown error.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        flash={flash}
        onCameraReady={() => setReady(true)}
      />
      <CaptureGuideOverlay />

      <View style={styles.topBar}>
        <Pressable onPress={onClose} hitSlop={12} disabled={busy}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </View>

      {bannerTitle ? (
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>➕ {bannerTitle}</Text>
          {bannerSubtitle ? (
            <Text style={styles.bannerSubtitle}>{bannerSubtitle}</Text>
          ) : null}
        </View>
      ) : null}

      {/* Processing / success overlay — gives feedback during upload + OCR. */}
      {busy ? (
        <View style={styles.processing} pointerEvents="auto">
          <ActivityIndicator color="#fff" size="large" />
          <Text style={styles.processingText}>Reading your page…</Text>
        </View>
      ) : null}
      {savedFlash && !busy ? (
        <View style={styles.processing} pointerEvents="none">
          <Text style={styles.savedText}>✓ Page added</Text>
        </View>
      ) : null}

      <View style={styles.bottomBar}>
        {secondaryActionLabel ? (
          <Pressable onPress={onSecondaryAction} style={styles.secondary} disabled={busy}>
            <Text style={styles.secondaryText}>{secondaryActionLabel}</Text>
          </Pressable>
        ) : (
          <View style={styles.secondary} />
        )}

        <Pressable
          style={[styles.shutter, (!ready || busy) && styles.shutterDisabled]}
          onPress={capture}
          disabled={busy || !ready}
        >
          {busy ? (
            <ActivityIndicator color="#111" />
          ) : (
            <Text style={styles.shutterText}>{ready ? 'Capture' : 'Starting…'}</Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => setFlash((f) => (f === 'off' ? 'on' : 'off'))}
          style={styles.secondary}
          disabled={busy}
        >
          <Text style={styles.secondaryText}>Flash: {flash === 'off' ? 'Off' : 'On'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  permissionText: { color: '#fff', textAlign: 'center', fontSize: 16 },
  permissionButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  permissionButtonText: { color: '#fff', fontWeight: '600' },
  cancel: { color: '#aaa', marginTop: 8 },
  topBar: { position: 'absolute', top: 50, left: 20 },
  close: { color: '#fff', fontSize: 26, fontWeight: '600' },
  banner: {
    position: 'absolute',
    top: 96,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  bannerTitle: { color: '#fff', fontWeight: '700', fontSize: 15 },
  bannerSubtitle: { color: '#d6e4ff', marginTop: 2, fontSize: 13 },
  processing: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  processingText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  savedText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  bottomBar: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  shutter: {
    backgroundColor: '#fff',
    paddingHorizontal: 28,
    paddingVertical: 18,
    borderRadius: 40,
    minWidth: 120,
    alignItems: 'center',
  },
  shutterDisabled: { opacity: 0.5 },
  shutterText: { color: '#111', fontWeight: '700', fontSize: 16 },
  secondary: { width: 90 },
  secondaryText: { color: '#fff', fontSize: 13 },
});
