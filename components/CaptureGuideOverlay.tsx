import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

interface Props {
  isProcessing?: boolean;
}

/**
 * A camera guide frame with glowing green corners that pulse,
 * and a scanning animation bar when OCR processing is active.
 */
export function CaptureGuideOverlay({ isProcessing = false }: Props) {
  const pulseAnim = useRef(new Animated.Value(0.5)).current;
  const scanAnim = useRef(new Animated.Value(0)).current;
  const [guideHeight, setGuideHeight] = useState(0);

  // Pulse animation for the corner brackets
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  // Scanning bar animation when processing
  useEffect(() => {
    if (isProcessing && guideHeight > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(scanAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scanAnim.setValue(0);
    }
  }, [isProcessing, guideHeight, scanAnim]);

  const translateY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [18, guideHeight - 20],
  });

  return (
    <View style={styles.overlay} pointerEvents="none">
      <View 
        style={styles.guideContainer}
        onLayout={(e) => setGuideHeight(e.nativeEvent.layout.height)}
      >
        {/* Subtle horizontal grid lines inside */}
        <View style={styles.gridLine} />
        <View style={[styles.gridLine, { top: '50%' }]} />
        <View style={[styles.gridLine, { top: '66%' }]} />

        {/* Pulsing Corner Brackets */}
        <Animated.View style={[styles.corner, styles.topLeft, { opacity: pulseAnim }]} />
        <Animated.View style={[styles.corner, styles.topRight, { opacity: pulseAnim }]} />
        <Animated.View style={[styles.corner, styles.bottomLeft, { opacity: pulseAnim }]} />
        <Animated.View style={[styles.corner, styles.bottomRight, { opacity: pulseAnim }]} />

        {/* Animated Scanning Line */}
        {isProcessing && guideHeight > 0 && (
          <Animated.View style={[styles.scanLine, { transform: [{ translateY }] }]} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  guideContainer: {
    width: '82%',
    maxWidth: 300,
    aspectRatio: 3 / 4,
    borderRadius: 14,
    backgroundColor: 'rgba(26, 23, 18, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    position: 'relative',
    overflow: 'hidden',
  },
  gridLine: {
    position: 'absolute',
    left: 24,
    right: 24,
    top: '34%',
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  corner: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderColor: '#54c1a4',
  },
  topLeft: {
    left: 18,
    top: 18,
    borderTopWidth: 2.5,
    borderLeftWidth: 2.5,
    borderTopLeftRadius: 8,
  },
  topRight: {
    right: 18,
    top: 18,
    borderTopWidth: 2.5,
    borderRightWidth: 2.5,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    left: 18,
    bottom: 18,
    borderBottomWidth: 2.5,
    borderLeftWidth: 2.5,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    right: 18,
    bottom: 18,
    borderBottomWidth: 2.5,
    borderRightWidth: 2.5,
    borderBottomRightRadius: 8,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#54c1a4',
    shadowColor: '#54c1a4',
    shadowOpacity: 0.8,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
});

