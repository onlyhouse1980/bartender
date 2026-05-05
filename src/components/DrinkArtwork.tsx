import { StyleSheet, Text, View } from 'react-native';

import type { DrinkArtworkSpec } from '../data/bartending';

type DrinkArtworkProps = {
  artwork: DrinkArtworkSpec;
  size?: number;
};

const GLASS_LABELS: Record<DrinkArtworkSpec['glassStyle'], string> = {
  highball: 'HB',
  rocks: 'RO',
  coupe: 'CP',
  martini: 'MT',
  wine: 'WG',
  mug: 'MB',
  hurricane: 'HC',
};

const GARNISH_LABELS: Partial<Record<NonNullable<DrinkArtworkSpec['garnish']>, string>> = {
  orange: 'Orange',
  lime: 'Limette',
  mint: 'Minze',
  coffee: 'Kaffee',
  pineapple: 'Ananas',
  cherry: 'Kirsche',
  grapefruit: 'Grapefruit',
  lemon: 'Zitrone',
};

export function DrinkArtwork({ artwork, size = 124 }: DrinkArtworkProps) {
  const borderRadius = Math.round(size * 0.23);
  const padding = Math.max(12, Math.round(size * 0.12));
  const liquidHeight = Math.round(size * (artwork.glassStyle === 'martini' ? 0.26 : 0.34));
  const labelSize = Math.max(14, Math.round(size * 0.12));
  const garnishLabel = artwork.garnish ? GARNISH_LABELS[artwork.garnish] ?? 'Garnitur' : null;

  return (
    <View
      style={[
        styles.frame,
        {
          width: size,
          height: size,
          borderRadius,
          padding,
          backgroundColor: artwork.background[0],
          borderColor: 'rgba(244, 237, 228, 0.16)',
        },
      ]}
    >
      <View style={[styles.glow, { backgroundColor: artwork.background[1], opacity: 0.72 }]} />
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.badge}>
            <Text style={[styles.badgeText, { fontSize: labelSize - 1 }]}>
              {GLASS_LABELS[artwork.glassStyle]}
            </Text>
          </View>
          {garnishLabel ? (
            <Text style={[styles.metaText, { fontSize: Math.max(10, labelSize - 5) }]}>
              {garnishLabel}
            </Text>
          ) : null}
        </View>

        <View style={styles.glassArea}>
          <View
            style={[
              styles.glassBody,
              {
                borderBottomLeftRadius: artwork.glassStyle === 'martini' ? 12 : 22,
                borderBottomRightRadius: artwork.glassStyle === 'martini' ? 12 : 22,
                borderTopLeftRadius: artwork.glassStyle === 'martini' ? 24 : 18,
                borderTopRightRadius: artwork.glassStyle === 'martini' ? 24 : 18,
              },
            ]}
          >
            <View
              style={[
                styles.liquid,
                {
                  height: liquidHeight,
                  backgroundColor: artwork.liquid[0],
                  borderTopColor: artwork.liquid[1],
                },
              ]}
            />
            {artwork.foam ? <View style={styles.foam} /> : null}
            {artwork.ice ? (
              <View style={styles.iceRow}>
                <View style={styles.iceCube} />
                <View style={[styles.iceCube, styles.iceCubeOffset]} />
                <View style={styles.iceCube} />
              </View>
            ) : null}
            {artwork.bubbles ? (
              <View style={styles.bubbleColumn}>
                <View style={[styles.bubble, styles.bubbleLarge]} />
                <View style={[styles.bubble, styles.bubbleMedium]} />
                <View style={[styles.bubble, styles.bubbleSmall]} />
              </View>
            ) : null}
          </View>

          <View style={styles.stem} />
          <View style={styles.base} />
        </View>

        <View style={styles.footerRow}>
          <Text style={[styles.metaText, { fontSize: Math.max(10, labelSize - 4) }]}>
            {artwork.straw ? 'Mit Strohhalm' : 'Ohne Strohhalm'}
          </Text>
          <Text style={[styles.metaText, { fontSize: Math.max(10, labelSize - 4) }]}>
            {artwork.saltRim ? 'Salzrand' : 'BarStart'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    left: -18,
    right: -18,
    bottom: -26,
    height: 88,
    borderRadius: 999,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    minWidth: 34,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(244, 237, 228, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(244, 237, 228, 0.18)',
  },
  badgeText: {
    color: '#F4EDE4',
    fontWeight: '700',
    textAlign: 'center',
  },
  metaText: {
    color: 'rgba(244, 237, 228, 0.82)',
    fontWeight: '600',
  },
  glassArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassBody: {
    width: 62,
    height: 72,
    borderWidth: 2,
    borderColor: 'rgba(244, 237, 228, 0.44)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  liquid: {
    position: 'absolute',
    left: 5,
    right: 5,
    bottom: 5,
    borderRadius: 14,
    borderTopWidth: 2,
  },
  foam: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 34,
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(252, 246, 231, 0.76)',
  },
  iceRow: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iceCube: {
    width: 11,
    height: 11,
    borderRadius: 3,
    backgroundColor: 'rgba(244, 248, 255, 0.46)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  iceCubeOffset: {
    marginTop: 4,
  },
  bubbleColumn: {
    position: 'absolute',
    right: 11,
    bottom: 16,
    gap: 5,
    alignItems: 'center',
  },
  bubble: {
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.34)',
  },
  bubbleLarge: {
    width: 8,
    height: 8,
  },
  bubbleMedium: {
    width: 6,
    height: 6,
  },
  bubbleSmall: {
    width: 4,
    height: 4,
  },
  stem: {
    width: 6,
    height: 18,
    borderRadius: 999,
    backgroundColor: 'rgba(244, 237, 228, 0.38)',
    marginTop: 3,
  },
  base: {
    width: 48,
    height: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(244, 237, 228, 0.34)',
    marginTop: 3,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
});
