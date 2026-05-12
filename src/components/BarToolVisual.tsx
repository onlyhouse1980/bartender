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
  jigger: '/bar-tools/jigger.svg',
  shaker: '/bar-tools/shaker.svg',
  'bar-spoon': '/bar-tools/bar-spoon.svg',
  'hawthorne-strainer': '/bar-tools/hawthorne-strainer.svg',
  'mixing-glass': '/bar-tools/mixing-glass.svg',
  muddler: '/bar-tools/muddler.svg',
  'fine-strainer': '/bar-tools/fine-strainer.svg',
};

export function BarToolVisual({
  kind,
  width = 184,
  height = 184,
  loading = 'lazy',
}: BarToolVisualProps) {
  if (Platform.OS === 'web') {
    return (
      <NextImage
        src={BAR_TOOL_IMAGE_URIS[kind]}
        alt=""
        width={width}
        height={height}
        loading={loading}
        sizes={`${width}px`}
        unoptimized
        style={{
          width,
          height,
          borderRadius: 18,
          objectFit: 'contain',
          display: 'block',
        }}
      />
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
