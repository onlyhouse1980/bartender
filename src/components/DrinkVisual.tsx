import Image from 'next/image';
import { Platform, StyleSheet, type ImageResizeMode } from 'react-native';

import type { Drink } from '../data/bartending';
import { DrinkArtwork } from './DrinkArtwork';

type DrinkVisualProps = {
  drink: Drink;
  size?: number;
  resizeMode?: ImageResizeMode;
};

const LOCAL_DRINK_IMAGES: Record<NonNullable<Drink['imageAsset']>, string> = {
  hugo: '/hugo.jpg',
};

function toObjectFit(resizeMode: ImageResizeMode): React.CSSProperties['objectFit'] {
  switch (resizeMode) {
    case 'contain':
      return 'contain';
    case 'stretch':
      return 'fill';
    case 'center':
      return 'scale-down';
    case 'repeat':
      return 'contain';
    case 'cover':
    default:
      return 'cover';
  }
}

export function DrinkVisual({ drink, size = 124, resizeMode = 'cover' }: DrinkVisualProps) {
  const uri =
    drink.imageAsset
      ? LOCAL_DRINK_IMAGES[drink.imageAsset]
      : drink.cachedImageDataUrl ?? drink.imageUrl ?? null;

  if (!uri) {
    return <DrinkArtwork artwork={drink.artwork} size={size} />;
  }

  return (
    <Image
      unoptimized={uri.startsWith('data:')}
      src={uri}
      alt=""
      width={size}
      height={size}
      sizes={`${size}px`}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.23),
        objectFit: toObjectFit(resizeMode),
        display: 'block',
        backgroundColor: '#E7D8C5',
      }}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: '#E7D8C5',
  },
});
