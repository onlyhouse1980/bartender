import NextImage from 'next/image';
import { Image, Platform } from 'react-native';

import type { BarToolIllustration } from '../data/bartending';

type BarToolVisualProps = {
  kind: BarToolIllustration;
  width?: number;
  height?: number;
  loading?: 'eager' | 'lazy';
};

const BAR_TOOL_IMAGE_URIS: Record<BarToolIllustration, string> = {
  'jigger': '/bar-tools/jigger.png',
  'shaker': '/bar-tools/shaker.png',
  'bar-spoon': '/bar-tools/barspoon.png',
  'hawthorne-strainer': '/bar-tools/strainer.png',
  'mixing-glass': '/bar-tools/mixing-glass.png',
  'muddler': '/bar-tools/muddler.png',
  'fine-strainer': '/bar-tools/feinsieb.png',
};

export function BarToolVisual({
  kind,
  width = 184,
  height = 184,
  loading = 'lazy',
}: BarToolVisualProps) {
  if (Platform.OS === 'web') {
    return (
      <span
        style={{
          width,
          height,
          borderRadius: 18,
          display: 'block',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <NextImage
          src={BAR_TOOL_IMAGE_URIS[kind]}
          alt=""
          fill
          loading={loading}
          sizes={`${width}px`}
          style={{
            borderRadius: 18,
            objectFit: 'contain',
          }}
        />
      </span>
    );
  }

  return (
    <Image
      alt=""
      source={{ uri: BAR_TOOL_IMAGE_URIS[kind] }}
      style={{
        width,
        height,
        borderRadius: 18,
      }}
      resizeMode="contain"
    />
  );
}
