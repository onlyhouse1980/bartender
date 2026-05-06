import NextImage, { type ImageLoaderProps } from 'next/image';
import { Image, Platform } from 'react-native';

import type { GlasswareIllustration } from '../data/bartending';

type GlasswareVisualProps = {
  kind: GlasswareIllustration;
  width?: number;
  height?: number;
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

function passthroughLoader({ src }: ImageLoaderProps) {
  return src;
}

export function GlasswareVisual({
  kind,
  width = 184,
  height = 184,
}: GlasswareVisualProps) {
  if (Platform.OS === 'web') {
    return (
      <NextImage
        loader={passthroughLoader}
        src={GLASSWARE_IMAGE_URIS[kind]}
        alt=""
        width={width}
        height={height}
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

  return (
    <Image
      alt=""
      source={{ uri: GLASSWARE_IMAGE_URIS[kind] }}
      style={{
        width,
        height,
        borderRadius: 18,
      }}
      resizeMode="contain"
    />
  );
}
