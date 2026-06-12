import Image from 'next/image';
import { Platform } from 'react-native';

import type { GlasswareIllustration } from '../data/bartending';

type GlasswareVisualProps = {
  kind: GlasswareIllustration;
  width?: number;
  height?: number;
  loading?: 'eager' | 'lazy';
};

const GLASSWARE_IMAGE_URIS: Record<GlasswareIllustration, string> = {
  coupe: '/glassware-cutout/coupe-glass.png',
  highball: '/glassware-cutout/high-ball.png',
  hurricane: '/glassware-cutout/hurricane-glass.png',
  martini: '/glassware-cutout/martini-glass.png',
  mule: '/glassware-cutout/mule-becher.png',
  rocks: '/glassware-cutout/rocks-glass.png',
  wine: '/glassware-cutout/wine-glass.png',
};

export function GlasswareVisual({
  kind,
  width = 184,
  height = 184,
  loading = 'lazy',
}: GlasswareVisualProps) {
  return (
    <Image
      src={GLASSWARE_IMAGE_URIS[kind]}
      alt=""
      width={width}
      height={height}
      loading={loading}
      sizes={`${width}px`}
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
