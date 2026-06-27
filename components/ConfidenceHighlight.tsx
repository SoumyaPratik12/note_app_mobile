import { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import type { NotePage } from '@/lib/types';
import { useThemeStore, themeColors } from '@/stores/themeStore';

interface Props {
  content: string;
  /**
   * Per-page metadata. Pages whose average OCR confidence is below
   * `threshold` have their text underlined to flag "trust this less".
   */
  pages?: Pick<NotePage, 'ocr_confidence' | 'raw_ocr_text'>[];
  threshold?: number;
}

/**
 * Renders the joined note text. Spans of text that came from a low-confidence
 * page are styled with a dashed underline.
 */
export function ConfidenceHighlight({ content, pages, threshold = 0.8 }: Props) {
  const theme = useThemeStore((s) => s.theme);
  const colors = themeColors[theme];

  const lowConfidenceSnippets = useMemo(() => {
    if (!pages) return [];
    return pages
      .filter(
        (p) =>
          p.ocr_confidence != null &&
          p.ocr_confidence < threshold &&
          !!p.raw_ocr_text,
      )
      .map((p) => p.raw_ocr_text!.trim())
      .filter(Boolean);
  }, [pages, threshold]);

  if (lowConfidenceSnippets.length === 0) {
    return <Text style={[styles.body, { color: colors.ink }]}>{content}</Text>;
  }

  // Split the content around each low-confidence snippet and underline it.
  const segments = splitOnSnippets(content, lowConfidenceSnippets);

  return (
    <Text style={[styles.body, { color: colors.ink }]}>
      {segments.map((seg, i) =>
        seg.lowConfidence ? (
          <Text 
            key={i} 
            style={[
              styles.lowConfidence, 
              { 
                color: colors.low, 
                textDecorationColor: colors.low,
              }
            ]}
          >
            {seg.text}
          </Text>
        ) : (
          <Text key={i}>{seg.text}</Text>
        ),
      )}
    </Text>
  );
}

interface Segment {
  text: string;
  lowConfidence: boolean;
}

function splitOnSnippets(content: string, snippets: string[]): Segment[] {
  let segments: Segment[] = [{ text: content, lowConfidence: false }];

  for (const snippet of snippets) {
    const next: Segment[] = [];
    for (const seg of segments) {
      if (seg.lowConfidence) {
        next.push(seg);
        continue;
      }
      const idx = seg.text.indexOf(snippet);
      if (idx === -1) {
        next.push(seg);
        continue;
      }
      if (idx > 0) next.push({ text: seg.text.slice(0, idx), lowConfidence: false });
      next.push({ text: snippet, lowConfidence: true });
      const rest = seg.text.slice(idx + snippet.length);
      if (rest) next.push({ text: rest, lowConfidence: false });
    }
    segments = next;
  }

  return segments;
}

const styles = StyleSheet.create({
  body: { 
    fontSize: 16.5, 
    lineHeight: 28, 
    fontWeight: '400',
  },
  lowConfidence: {
    fontWeight: '600',
    textDecorationLine: 'underline',
    textDecorationStyle: 'dashed',
  },
});

