import { StyleSheet, Text, View } from 'react-native';

/**
 * A soft rectangle suggesting where to place the note page within the frame.
 * Purely advisory — capture is never blocked on alignment.
 */
export function CaptureGuideOverlay() {
  return (
    <View style={styles.overlay} pointerEvents="none">
      <View style={styles.frame}>
        <Text style={styles.hint}>Position note within frame</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: '82%',
    height: '70%',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
    borderRadius: 16,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 12,
  },
  hint: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
});
