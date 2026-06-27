import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CaptureGuideOverlay } from './CaptureGuideOverlay';

interface Props {
  /** Shown as a persistent banner (e.g. "Physics notes · Page 4"). */
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
  const [error, setError] = useState<string | null>(null);
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
        <ActivityIndicator color="#54c1a4" size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: '#0e0d0a' }]}>
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
    setError(null);
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
      setError((e as Error).message || 'Something went wrong');
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
      
      {/* Interactive scanning corners overlay */}
      <CaptureGuideOverlay isProcessing={busy} />

      {/* Top Bar controls */}
      <View style={styles.topBar}>
        <Pressable 
          onPress={onClose} 
          hitSlop={12} 
          disabled={busy}
          style={styles.circleBtn}
          aria-label="Close"
        >
          <View style={styles.closeIcon}>
            <View style={[styles.closeLine, { transform: [{ rotate: '45deg' }] }]} />
            <View style={[styles.closeLine, { transform: [{ rotate: '-45deg' }] }]} />
          </View>
        </Pressable>

        <Pressable 
          onPress={() => setFlash((f) => (f === 'off' ? 'on' : 'off'))} 
          style={[styles.circleBtn, flash === 'on' && styles.circleBtnActive]}
          disabled={busy}
          aria-label="Flash"
        >
          <Text style={styles.flashEmoji}>⚡</Text>
        </Pressable>
      </View>

      {/* Banner indicator */}
      {bannerTitle ? (
        <View style={styles.banner}>
          <View style={styles.bannerDot} />
          <Text style={styles.bannerTitle}>
            Adding to: {bannerTitle} {bannerSubtitle ? `· ${bannerSubtitle}` : ''}
          </Text>
        </View>
      ) : null}

      {/* Overlays */}
      {/* 1. Processing State */}
      {busy && (
        <View style={styles.scrimOverlay} pointerEvents="auto">
          <ActivityIndicator color="#54c1a4" size="large" />
          <Text style={styles.processingText}>Reading your page…</Text>
        </View>
      )}

      {/* 2. Page Added Success State */}
      {savedFlash && !busy && (
        <View style={styles.scrimOverlay} pointerEvents="none">
          <View style={styles.successCircle}>
            <View style={styles.checkIcon}>
              <View style={[styles.checkPart1, { backgroundColor: '#0c1512' }]} />
              <View style={[styles.checkPart2, { backgroundColor: '#0c1512' }]} />
            </View>
          </View>
          <Text style={styles.successText}>Page added</Text>
        </View>
      )}

      {/* 3. Custom Error State */}
      {error && !busy && (
        <View style={styles.scrimOverlay} pointerEvents="auto">
          <View style={styles.errorCircle}>
            <Text style={styles.errorExclamation}>!</Text>
          </View>
          <Text style={styles.errorTitle}>Couldn't read this page</Text>
          <Text style={styles.errorDesc}>Try better lighting and hold the camera steady.</Text>
          <Text style={styles.errorDetails}>({error})</Text>
          
          <View style={styles.errorActions}>
            <Pressable style={styles.errorBtnSecondary} onPress={onClose}>
              <Text style={styles.errorBtnSecondaryText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.errorBtnPrimary} onPress={capture}>
              <Text style={styles.errorBtnPrimaryText}>Retry</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Bottom controls */}
      {!busy && !savedFlash && !error && (
        <View style={styles.bottomBar}>
          {secondaryActionLabel ? (
            <Pressable onPress={onSecondaryAction} style={styles.secondaryBtn} disabled={busy}>
              <Text style={styles.secondaryBtnText}>{secondaryActionLabel}</Text>
            </Pressable>
          ) : (
            <View style={styles.secondaryBtn} />
          )}

          <Pressable
            style={[styles.shutterBtn, (!ready || busy) && styles.shutterBtnDisabled]}
            onPress={capture}
            disabled={busy || !ready}
            aria-label="Capture"
          >
            <View style={styles.shutterBtnInner} />
          </Pressable>

          <View style={styles.secondaryBtn} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0c0b09' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  permissionText: { color: '#fff', textAlign: 'center', fontSize: 16, fontWeight: '500' },
  permissionButton: {
    backgroundColor: '#1f6f5c',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 12,
  },
  permissionButtonText: { color: '#fff', fontWeight: '600' },
  cancel: { color: 'rgba(255,255,255,0.6)', marginTop: 8, fontSize: 15 },
  topBar: { 
    position: 'absolute', 
    top: 50, 
    left: 18, 
    right: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  circleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleBtnActive: {
    backgroundColor: 'rgba(84, 193, 164, 0.3)',
  },
  closeIcon: {
    width: 16,
    height: 16,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeLine: {
    width: 16,
    height: 2,
    backgroundColor: '#fff',
    borderRadius: 1,
    position: 'absolute',
  },
  flashEmoji: {
    fontSize: 16,
    color: '#fff',
  },
  banner: {
    position: 'absolute',
    top: 110,
    alignSelf: 'center',
    backgroundColor: 'rgba(84, 193, 164, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(84, 193, 164, 0.4)',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    zIndex: 10,
  },
  bannerDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#54c1a4',
  },
  bannerTitle: { color: '#dfeee8', fontWeight: '600', fontSize: 13.5 },
  scrimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20, 18, 14, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    zIndex: 20,
    padding: 24,
  },
  processingText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '600',
    marginTop: 8,
  },
  successCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#54c1a4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successText: { 
    color: '#fff', 
    fontSize: 16.5, 
    fontWeight: '700',
    marginTop: 8,
  },
  errorCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(178, 59, 46, 0.18)',
    borderWidth: 1.5,
    borderColor: '#d8564a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorExclamation: {
    color: '#f0a59c',
    fontSize: 26,
    fontWeight: '700',
  },
  errorTitle: {
    color: '#fff',
    fontSize: 15.5,
    fontWeight: '700',
    marginTop: 6,
  },
  errorDesc: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 250,
    marginTop: -6,
    lineHeight: 18,
  },
  errorDetails: {
    color: 'rgba(255, 255, 255, 0.38)',
    fontSize: 11,
    textAlign: 'center',
    maxWidth: 240,
    marginTop: 2,
    lineHeight: 15,
  },
  errorActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  errorBtnSecondary: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBtnSecondaryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14.5,
  },
  errorBtnPrimary: {
    height: 44,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#54c1a4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBtnPrimaryText: {
    color: '#0c1512',
    fontWeight: '700',
    fontSize: 14.5,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    zIndex: 10,
  },
  shutterBtn: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 5,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  shutterBtnDisabled: { opacity: 0.5 },
  shutterBtnInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#fff',
  },
  secondaryBtn: { 
    width: 100, 
    justifyContent: 'center',
  },
  secondaryBtnText: { 
    color: '#fff', 
    fontSize: 14.5,
    fontWeight: '600',
    opacity: 0.85,
  },
  checkIcon: {
    width: 20,
    height: 20,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkPart1: {
    position: 'absolute',
    width: 3.5,
    height: 10,
    borderRadius: 1.7,
    transform: [{ rotate: '-45deg' }],
    left: 2,
    bottom: 3,
  },
  checkPart2: {
    position: 'absolute',
    width: 3.5,
    height: 17,
    borderRadius: 1.7,
    transform: [{ rotate: '45deg' }],
    right: 2,
    bottom: 5,
  },
});

